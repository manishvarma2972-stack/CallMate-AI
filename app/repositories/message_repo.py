"""Development-only file-based message persistence repository.

Provides atomic, collision-safe file writes for caller messages with restricted
file permissions (0o600), safe temporary file cleanup, and zero PII logging.

IMPORTANT: This JSON file persistence is for Phase 2 local development only.
PostgreSQL migration is required before real production telephone calls are accepted.
"""

from datetime import datetime, timezone
from functools import lru_cache
import json
import logging
import os
from pathlib import Path
import re
import tempfile
from typing import Any, Dict, Optional
import uuid

from app.core.config import get_settings
from app.core.errors import InvalidSessionIdError

logger = logging.getLogger("app.repositories.messages")

UUID4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class MessageRepository:
    """Atomic file repository for persisting caller messages during development."""

    def __init__(self, storage_dir: Optional[Path] = None) -> None:
        settings = get_settings()
        self._storage_dir = storage_dir or Path(settings.MESSAGE_STORAGE_PATH)
        self._storage_dir.mkdir(parents=True, exist_ok=True)

    def save_message(
        self,
        session_id: str,
        caller_name: str,
        message: str,
        phone_number: Optional[str] = None,
        urgency: str = "medium",
    ) -> Dict[str, Any]:
        """Atomically persist caller message with collision prevention and safe cleanup."""
        # 1. Validate session_id format to prevent directory traversal attacks
        if not UUID4_PATTERN.match(session_id):
            raise InvalidSessionIdError(f"Session ID violates UUIDv4 format: {session_id}")

        # 2. Generate unique message ID to prevent filename collisions
        msg_id = f"msg_{uuid.uuid4().hex}"
        recorded_at = datetime.now(timezone.utc).isoformat()
        target_path = self._storage_dir / f"{msg_id}.json"

        record: Dict[str, Any] = {
            "message_id": msg_id,
            "session_id": session_id,
            "caller_name": caller_name,
            "phone_number": phone_number,
            "message": message,
            "urgency": urgency,
            "recorded_at": recorded_at,
        }

        tmp_path: Optional[Path] = None
        try:
            # 3. Write to a temporary file in the same directory (guarantees same filesystem)
            with tempfile.NamedTemporaryFile("w", dir=self._storage_dir, delete=False, suffix=".tmp") as tmp_file:
                tmp_path = Path(tmp_file.name)
                json.dump(record, tmp_file, indent=2)
                tmp_file.flush()
                os.fsync(tmp_file.fileno())

            # 4. Enforce restricted owner-only read/write permissions (0o600)
            os.chmod(tmp_path, 0o600)

            # 5. Atomic rename guarantees collision safety and read consistency
            os.replace(tmp_path, target_path)
            tmp_path = None  # Clear so finally block does not delete successfully renamed file

            # 6. Log success without sensitive caller PII
            logger.info(
                "Caller message persisted: message_id=%s session_id=%s urgency=%s",
                msg_id,
                session_id,
                urgency,
            )

            return {
                "status": "recorded",
                "retryable": False,
                "message": "Message recorded successfully.",
                "message_id": msg_id,
                "recorded_at": recorded_at,
            }

        except Exception as exc:
            logger.error(
                "Failed to persist caller message: session_id=%s error=%s",
                session_id,
                str(exc),
            )
            return {
                "status": "error",
                "retryable": True,
                "message": "Temporary storage failure. Please ask the caller to repeat or leave a shorter message.",
            }

        finally:
            # 7. Clean up orphaned temporary file on failure
            if tmp_path and tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass

    def get_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored message by ID for testing and verification."""
        target_path = self._storage_dir / f"{message_id}.json"
        if not target_path.exists():
            return None
        with open(target_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def list_messages(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List stored caller messages ordered by recorded_at descending."""
        messages: List[Dict[str, Any]] = []
        if not self._storage_dir.exists():
            return messages

        for file_path in self._storage_dir.glob("msg_*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    messages.append(data)
            except Exception:
                continue

        messages.sort(key=lambda m: m.get("recorded_at", ""), reverse=True)
        return messages[:limit]

    def delete_message(self, message_id: str) -> bool:
        """Safely delete a stored message by ID."""
        if not re.match(r"^msg_[0-9a-f]{32}$", message_id):
            return False
        target_path = self._storage_dir / f"{message_id}.json"
        if target_path.exists():
            try:
                target_path.unlink()
                return True
            except OSError:
                return False
        return False


@lru_cache
def get_message_repository() -> MessageRepository:
    """Singleton getter for the MessageRepository."""
    return MessageRepository()
