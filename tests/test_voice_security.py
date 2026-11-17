"""Automated tests for session authorization, token cryptographic signing, replay, and rate limits."""

import asyncio
from typing import Generator
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from pydantic import SecretStr

from app.core.config import Environment, Settings
from app.core.errors import InvalidTokenError, OwnerNotConfiguredError, RateLimitExceededError, TokenAlreadyUsedError
from app.main import create_app
from app.schemas.voice import VoiceSessionCreateRequest
from app.services.session import VoiceSessionManager


@pytest.fixture
def configured_settings() -> Settings:
    """Settings with valid owner and security keys."""
    return Settings(
        APP_NAME="CallMate Security Test",
        ENVIRONMENT=Environment.TEST,
        OWNER_API_KEY=SecretStr("valid-owner-test-key"),
        SECRET_KEY=SecretStr("32-byte-cryptographic-secret-test-key!"),
        RECEPTIONIST_OWNER_NAME="Verified Owner",
        SESSION_RATE_LIMIT_PER_MINUTE=5,
    )


@pytest.fixture
def security_app(configured_settings: Settings) -> FastAPI:
    """FastAPI application configured with explicit owner and security settings."""
    return create_app(settings=configured_settings)


@pytest.fixture
def sec_client(security_app: FastAPI) -> Generator[TestClient, None, None]:
    """TestClient bound to security_app."""
    with TestClient(security_app) as client:
        yield client


def test_session_creation_rejected_when_owner_not_configured(sec_client: TestClient) -> None:
    """Verify session creation fails with 412 Precondition Failed if RECEPTIONIST_OWNER_NAME is unset."""
    unconfigured_settings = Settings(
        ENVIRONMENT=Environment.TEST,
        OWNER_API_KEY=SecretStr("valid-owner-test-key"),
        SECRET_KEY=SecretStr("32-byte-cryptographic-secret-test-key!"),
        RECEPTIONIST_OWNER_NAME=None,  # Unset
    )
    app = create_app(settings=unconfigured_settings)
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/voice/sessions",
            headers={"X-API-Key": "valid-owner-test-key"},
            json={"language_hint": "en"},
        )
        assert resp.status_code == 412
        assert resp.json()["error"]["code"] == "OWNER_NOT_CONFIGURED"


def test_session_creation_requires_valid_api_key(sec_client: TestClient) -> None:
    """Verify 401 Unauthorized when X-API-Key is missing or invalid."""
    # Missing key
    resp_missing = sec_client.post("/api/v1/voice/sessions", json={})
    assert resp_missing.status_code == 401
    assert resp_missing.json()["error"]["code"] == "UNAUTHORIZED"

    # Invalid key
    resp_invalid = sec_client.post(
        "/api/v1/voice/sessions",
        headers={"X-API-Key": "wrong-key"},
        json={},
    )
    assert resp_invalid.status_code == 401
    assert resp_invalid.json()["error"]["code"] == "UNAUTHORIZED"


def test_session_creation_success(sec_client: TestClient) -> None:
    """Verify successful session creation returns session_id and signed token."""
    resp = sec_client.post(
        "/api/v1/voice/sessions",
        headers={"X-API-Key": "valid-owner-test-key"},
        json={"language_hint": "te"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "session_id" in data
    assert "token" in data
    assert data["owner_name"] == "Verified Owner"
    assert data["receptionist_name"] == "CallMate"


def test_session_creation_via_cookie_success(sec_client: TestClient, security_app: FastAPI) -> None:
    """Verify same-origin browser client can provision session via signed HttpOnly cookie."""
    # 1. Fetch index to receive HttpOnly owner session cookie
    index_res = sec_client.get("/")
    assert index_res.status_code == 200
    assert "callmate_owner_session" in index_res.cookies

    # 2. Call POST /api/v1/voice/sessions without X-API-Key (cookie is passed automatically)
    resp = sec_client.post(
        "/api/v1/voice/sessions",
        json={"language_hint": "en"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "session_id" in data
    assert "token" in data
    assert data["owner_name"] == "Verified Owner"


def test_session_creation_via_tampered_cookie_rejected(sec_client: TestClient) -> None:
    """Verify that a forged or tampered session cookie is rejected with 401 Unauthorized."""
    sec_client.cookies.set("callmate_owner_session", "123456789.badnonce.badsig")
    resp = sec_client.post(
        "/api/v1/voice/sessions",
        json={"language_hint": "en"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_session_creation_expired_cookie_rejected(sec_client: TestClient, configured_settings: Settings) -> None:
    """Verify that an expired session cookie (>24 hours) is rejected with 401 Unauthorized."""
    import hashlib
    import hmac
    import secrets
    import time
    # Create expired cookie (timestamp 25 hours ago)
    old_timestamp = int(time.time()) - (25 * 3600)
    nonce = secrets.token_hex(16)
    payload = f"owner_web_session:{old_timestamp}:{nonce}".encode("utf-8")
    sig = hmac.new(
        configured_settings.SECRET_KEY.get_secret_value().encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    expired_cookie = f"{old_timestamp}.{nonce}.{sig}"

    sec_client.cookies.set("callmate_owner_session", expired_cookie)
    resp = sec_client.post("/api/v1/voice/sessions", json={"language_hint": "en"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_session_creation_incorrect_signing_key_rejected(sec_client: TestClient) -> None:
    """Verify that a cookie signed with an incorrect secret key is rejected with 401."""
    import hashlib
    import hmac
    import secrets
    import time
    timestamp = int(time.time())
    nonce = secrets.token_hex(16)
    payload = f"owner_web_session:{timestamp}:{nonce}".encode("utf-8")
    # Signed with wrong foreign key
    wrong_sig = hmac.new(
        b"completely-wrong-foreign-secret-key-for-test!",
        payload,
        hashlib.sha256,
    ).hexdigest()
    invalid_key_cookie = f"{timestamp}.{nonce}.{wrong_sig}"

    sec_client.cookies.set("callmate_owner_session", invalid_key_cookie)
    resp = sec_client.post("/api/v1/voice/sessions", json={"language_hint": "en"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


def test_auth_session_endpoints_lifecycle(sec_client: TestClient) -> None:
    """Verify GET/POST/DELETE on /api/v1/auth/session for explicit owner authentication."""
    # 1. Invalid login attempt
    bad_login = sec_client.post("/api/v1/auth/session", json={"api_key": "wrong-owner-key"})
    assert bad_login.status_code == 401

    # 2. Valid login attempt
    good_login = sec_client.post("/api/v1/auth/session", json={"api_key": "valid-owner-test-key"})
    assert good_login.status_code == 200
    assert good_login.json()["authenticated"] is True
    assert "callmate_owner_session" in sec_client.cookies

    # 3. GET /api/v1/auth/session confirms authenticated status
    status_res = sec_client.get("/api/v1/auth/session")
    assert status_res.status_code == 200
    assert status_res.json()["authenticated"] is True

    # 4. DELETE /api/v1/auth/session logs out
    del_res = sec_client.delete("/api/v1/auth/session")
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_token_replay_protection(configured_settings: Settings) -> None:
    """Verify that a single-use token cannot be consumed twice."""
    manager = VoiceSessionManager(settings=configured_settings)
    session_res = manager.create_session(
        request=VoiceSessionCreateRequest(),
        client_identifier="client_1",
    )

    # First consumption succeeds
    consumed_session = await manager.validate_and_consume_token(
        session_id=session_res.session_id,
        token_str=session_res.token,
    )
    assert consumed_session["token_consumed"] is True

    # Replay attempt fails
    with pytest.raises(TokenAlreadyUsedError):
        await manager.validate_and_consume_token(
            session_id=session_res.session_id,
            token_str=session_res.token,
        )


@pytest.mark.asyncio
async def test_simultaneous_token_consumption_race_condition(configured_settings: Settings) -> None:
    """Verify that concurrent tasks attempting to consume the same token result in exactly one success."""
    manager = VoiceSessionManager(settings=configured_settings)
    session_res = manager.create_session(
        request=VoiceSessionCreateRequest(),
        client_identifier="client_concurrent",
    )

    async def attempt_handshake() -> str:
        try:
            await manager.validate_and_consume_token(
                session_id=session_res.session_id,
                token_str=session_res.token,
            )
            return "SUCCESS"
        except TokenAlreadyUsedError:
            return "REJECTED_ALREADY_USED"
        except Exception as e:
            return f"ERROR: {type(e).__name__}"

    # Fire 5 simultaneous handshake requests with the exact same token
    results = await asyncio.gather(*(attempt_handshake() for _ in range(5)))

    # Exactly 1 request must succeed
    assert results.count("SUCCESS") == 1
    # The other 4 must be rejected for replay
    assert results.count("REJECTED_ALREADY_USED") == 4


def test_rate_limiting_enforcement_and_isolation(configured_settings: Settings) -> None:
    """Verify rate limits reject excess requests and maintain isolation between clients."""
    # Configured limit is 5 requests per minute
    manager = VoiceSessionManager(settings=configured_settings)
    req = VoiceSessionCreateRequest()

    # Client A: first 5 requests succeed
    for _ in range(5):
        manager.create_session(request=req, client_identifier="client_A")

    # Client A: 6th request fails with RateLimitExceededError
    with pytest.raises(RateLimitExceededError):
        manager.create_session(request=req, client_identifier="client_A")

    # Client B: isolated limit; first request succeeds despite Client A being rate limited
    client_b_res = manager.create_session(request=req, client_identifier="client_B")
    assert client_b_res.session_id is not None
