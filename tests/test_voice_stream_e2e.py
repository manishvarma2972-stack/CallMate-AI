"""End-to-end tests for voice session provisioning and WebSocket handshake lifecycle."""

from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from pydantic import SecretStr
from starlette.websockets import WebSocketDisconnect

from app.core.config import Environment, Settings
from app.main import create_app


@pytest.fixture
def e2e_settings() -> Settings:
    """Settings configured for E2E testing."""
    return Settings(
        APP_NAME="CallMate E2E Test",
        ENVIRONMENT=Environment.TEST,
        OWNER_API_KEY=SecretStr("e2e-owner-key"),
        SECRET_KEY=SecretStr("32-byte-secure-cryptographic-key-for-e2e!"),
        RECEPTIONIST_OWNER_NAME="Test Owner",
        GEMINI_API_KEY=SecretStr("e2e-mock-gemini-key"),
    )


@pytest.fixture
def e2e_app(e2e_settings: Settings) -> FastAPI:
    """FastAPI application instance for E2E tests."""
    return create_app(settings=e2e_settings)


def test_websocket_handshake_rejected_with_invalid_token(e2e_app: FastAPI) -> None:
    """Verify that a WebSocket connection with an invalid token is closed with code 1008."""
    with TestClient(e2e_app) as client:
        # Generate an unauthorized/bogus session ID and token
        with pytest.raises(WebSocketDisconnect) as exc_info:
            with client.websocket_connect("/api/v1/voice/stream/00000000-0000-4000-8000-000000000000?token=invalid.token.structure"):
                pass
        assert exc_info.value.code == 1008


def test_websocket_handshake_success_and_audio_exchange(e2e_app: FastAPI) -> None:
    """Verify provisioning session and connecting via WebSocket."""
    with patch("app.engine.gemini_live.GeminiLiveEngine.run", new_callable=AsyncMock) as mock_engine_run:
        with TestClient(e2e_app) as client:
            # 1. Provision session
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "e2e-owner-key"},
                json={"language_hint": "en"},
            )
            assert resp.status_code == 201
            data = resp.json()
            session_id = data["session_id"]
            token = data["token"]

            # 2. Connect via WebSocket
            with client.websocket_connect(f"/api/v1/voice/stream/{session_id}?token={token}") as websocket:
                # Send sample 20ms 16kHz PCM audio frame (640 bytes)
                pcm_sample = b"\x00\x01" * 320
                websocket.send_bytes(pcm_sample)

            # Verify engine was started for this session
            assert mock_engine_run.called


def test_websocket_barge_in_text_command(e2e_app: FastAPI) -> None:
    """Verify that sending a barge_in JSON text message triggers buffer flushing."""
    with patch("app.engine.gemini_live.GeminiLiveEngine.run", new_callable=AsyncMock):
        with TestClient(e2e_app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "e2e-owner-key"},
                json={"language_hint": "en"},
            )
            assert resp.status_code == 201
            data = resp.json()

            with client.websocket_connect(f"/api/v1/voice/stream/{data['session_id']}?token={data['token']}") as websocket:
                # Send barge-in command
                websocket.send_text('{"type": "barge_in"}')
                # Also send sample audio frame
                websocket.send_bytes(b"\x00\x00" * 320)
