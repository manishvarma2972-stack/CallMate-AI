"""In-memory voice session management and authentication service.

IMPORTANT: This in-memory implementation is intended strictly for single-process
local development. Production multi-worker or multi-container deployments will
require shared, durable state (e.g., Redis) for distributed locks and rate limits.
"""

import asyncio
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import hmac
import logging
from pathlib import Path
import re
import secrets
import time
from typing import Dict, List, Optional
import uuid

from app.core.config import Settings, get_settings
from app.core.errors import (
    InvalidSessionIdError,
    InvalidTokenError,
    OwnerNotConfiguredError,
    RateLimitExceededError,
    SessionCapacityExceededError,
    SessionNotFoundError,
    TokenAlreadyUsedError,
)
from app.schemas.voice import VoiceSessionCreateRequest, VoiceSessionResponse

logger = logging.getLogger("app.services.session")

UUID4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class VoiceSessionManager:
    """Manages voice session lifecycle, token authorization, concurrency, and rate limiting."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self._settings = settings or get_settings()
        self._sessions: Dict[str, dict] = {}
        self._rate_limit_records: Dict[str, List[float]] = {}
        # Asynchronous lock to guarantee atomic check-and-set token consumption
        self._lock = asyncio.Lock()

    def check_rate_limit(self, client_identifier: str) -> None:
        """Enforce in-memory sliding-window rate limit per client."""
        now = time.time()
        window_start = now - 60.0

        timestamps = self._rate_limit_records.setdefault(client_identifier, [])
        # Evict timestamps older than 60 seconds
        self._rate_limit_records[client_identifier] = [ts for ts in timestamps if ts > window_start]

        if len(self._rate_limit_records[client_identifier]) >= self._settings.SESSION_RATE_LIMIT_PER_MINUTE:
            logger.warning("Rate limit exceeded for client: %s", client_identifier)
            raise RateLimitExceededError()

        self._rate_limit_records[client_identifier].append(now)

    def create_session(
        self,
        request: VoiceSessionCreateRequest,
        client_identifier: str = "default_client",
    ) -> VoiceSessionResponse:
        """Provision a cryptographically signed voice session."""
        # 1. Require owner display name before creating sessions
        if not self._settings.is_owner_configured:
            logger.error("Attempted to create voice session without RECEPTIONIST_OWNER_NAME configured")
            raise OwnerNotConfiguredError()

        # 2. Check rate limit
        self.check_rate_limit(client_identifier)

        # 3. Enforce maximum concurrent active sessions
        active_count = sum(1 for s in self._sessions.values() if s["state"] in ("INITIALIZED", "ACTIVE"))
        if active_count >= self._settings.MAX_ACTIVE_VOICE_SESSIONS:
            logger.warning("Maximum concurrent voice sessions reached (%d)", active_count)
            raise SessionCapacityExceededError()

        # 4. Generate UUIDv4 session ID and cryptographically secure nonce
        session_id = str(uuid.uuid4())
        nonce = secrets.token_hex(16)
        expires_at = int(time.time()) + self._settings.SESSION_TOKEN_TTL_SECONDS

        # 5. Build HMAC-SHA256 signature
        payload = f"{session_id}:{expires_at}:{nonce}".encode("utf-8")
        signature = hmac.new(
            self._settings.SECRET_KEY.get_secret_value().encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        token = f"{session_id}.{expires_at}.{nonce}.{signature}"

        # 6. Store in-memory session metadata
        self._sessions[session_id] = {
            "session_id": session_id,
            "created_at": time.time(),
            "expires_at": expires_at,
            "token_signature": signature,
            "token_consumed": False,
            "state": "INITIALIZED",
            "caller_phone": request.caller_phone,
            "language_hint": request.language_hint,
        }

        logger.info("Voice session provisioned successfully: session_id=%s", session_id)

        ws_url = f"/api/v1/voice/stream/{session_id}"
        return VoiceSessionResponse(
            session_id=session_id,
            token=token,
            expires_at=expires_at,
            ws_url=ws_url,
            owner_name=self._settings.RECEPTIONIST_OWNER_NAME,  # type: ignore[arg-type]
            receptionist_name=self._settings.RECEPTIONIST_NAME,
        )

    async def validate_and_consume_token(self, session_id: str, token_str: str) -> dict:
        """Validate HMAC token and atomically consume it under an asyncio lock."""
        # 1. Validate session_id format
        if not UUID4_PATTERN.match(session_id):
            raise InvalidSessionIdError(f"Session ID violates UUIDv4 format: {session_id}")

        # 2. Parse token segments
        try:
            tok_session_id, expires_at_str, nonce, sig = token_str.split(".")
            expires_at = int(expires_at_str)
        except (ValueError, AttributeError):
            raise InvalidTokenError("Malformed session token structure")

        # 3. Check constant-time session ID match
        if not hmac.compare_digest(session_id, tok_session_id):
            raise InvalidTokenError("Token is not bound to the requested session ID")

        # 4. Check expiration
        if time.time() > expires_at:
            raise InvalidTokenError("Session token has expired")

        # 5. Check constant-time HMAC signature
        expected_payload = f"{tok_session_id}:{expires_at_str}:{nonce}".encode("utf-8")
        expected_sig = hmac.new(
            self._settings.SECRET_KEY.get_secret_value().encode("utf-8"),
            expected_payload,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, sig):
            raise InvalidTokenError("Invalid token cryptographic signature")

        # 6. Atomically check and consume token under lock
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                raise SessionNotFoundError(f"Session not found: {session_id}")

            if session["token_consumed"]:
                logger.warning("Replay attack prevented: Token already consumed for session %s", session_id)
                raise TokenAlreadyUsedError("Session token has already been consumed")

            # Consume token
            session["token_consumed"] = True
            session["state"] = "ACTIVE"
            session["connected_at"] = time.time()
            return session

    def terminate_session(self, session_id: str) -> None:
        """Mark session terminated and release resources."""
        if session_id in self._sessions:
            self._sessions[session_id]["state"] = "TERMINATED"
            logger.info("Voice session terminated: session_id=%s", session_id)

    def get_session(self, session_id: str) -> Optional[dict]:
        """Fetch session metadata."""
        return self._sessions.get(session_id)

    def create_owner_session_token(self) -> str:
        """Create a cryptographically signed owner web session token for same-origin browser clients."""
        timestamp = int(time.time())
        nonce = secrets.token_hex(16)
        payload = f"owner_web_session:{timestamp}:{nonce}".encode("utf-8")
        signature = hmac.new(
            self._settings.SECRET_KEY.get_secret_value().encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return f"{timestamp}.{nonce}.{signature}"

    def verify_owner_session_token(self, token_str: str) -> bool:
        """Validate cryptographic signature and expiry of an owner web session token."""
        if not token_str or not isinstance(token_str, str):
            return False
        parts = token_str.split(".")
        if len(parts) != 3:
            return False
        timestamp_str, nonce, signature = parts
        try:
            timestamp = int(timestamp_str)
        except ValueError:
            return False

        now = time.time()
        # Clock skew protection (max 60 seconds into future)
        if timestamp > now + 60:
            return False
        # 24-hour validity for browser dashboard session
        if now > timestamp + (24 * 3600):
            return False

        expected_payload = f"owner_web_session:{timestamp}:{nonce}".encode("utf-8")
        expected_sig = hmac.new(
            self._settings.SECRET_KEY.get_secret_value().encode("utf-8"),
            expected_payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(signature, expected_sig)


@lru_cache
def get_session_manager() -> VoiceSessionManager:
    """Singleton getter for VoiceSessionManager."""
    return VoiceSessionManager()
