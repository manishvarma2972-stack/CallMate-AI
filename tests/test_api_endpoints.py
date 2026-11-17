"""Automated tests for messages listing/deletion and assistant config endpoints."""

import os
from pathlib import Path
import pytest
from starlette.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.repositories.message_repo import MessageRepository, get_message_repository


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    """Create test client with isolated storage directory."""
    test_repo = MessageRepository(storage_dir=tmp_path / "messages")
    test_settings = Settings(
        RECEPTIONIST_OWNER_NAME="Manish Varma",
        RECEPTIONIST_NAME="CallMate",
        MESSAGE_STORAGE_PATH=str(tmp_path / "messages"),
    )
    app = create_app(settings=test_settings)
    app.dependency_overrides[get_message_repository] = lambda: test_repo
    return TestClient(app)


def test_get_assistant_config(client: TestClient) -> None:
    """Verify assistant config returns persona, owner bindings, and supported languages."""
    response = client.get("/api/v1/assistant/config")
    assert response.status_code == 200
    data = response.json()
    assert data["receptionist_name"] == "CallMate"
    assert data["owner_name"] == "Manish Varma"
    assert data["gemini_model"] == "gemini-3.8-live"
    assert any(lang["code"] == "te" for lang in data["supported_languages"])
    assert any(lang["code"] == "en" for lang in data["supported_languages"])
    assert data["telecom_integration"]["status"] == "awaiting_carrier_trunking"


def test_list_and_delete_messages_api(client: TestClient) -> None:
    """Verify retrieving and deleting caller messages via REST API."""
    # List when empty
    res = client.get("/api/v1/messages")
    assert res.status_code == 200
    assert res.json()["total"] == 0

    # Delete non-existent
    del_res = client.delete("/api/v1/messages/msg_00000000000000000000000000000000")
    assert del_res.status_code == 404


def test_serve_static_index_and_assets(client: TestClient) -> None:
    """Verify that root / serves CallMate.ai index.html and static assets."""
    res = client.get("/")
    assert res.status_code == 200
    assert "CallMate.ai" in res.text
    assert "Live Voice Studio" in res.text

    # Verify CSS static mount
    css_res = client.get("/static/css/styles.css")
    assert css_res.status_code == 200
    assert "--color-brand-primary: #3478F6;" in css_res.text
    assert "--color-brand-audio-cyan: #32C7D9;" in css_res.text

    # Verify JS static mount
    js_res = client.get("/static/js/main.js")
    assert js_res.status_code == 200
    assert "CallMate.ai" in js_res.text

    # Verify dev test endpoint
    dev_res = client.get("/dev/audio-test")
    assert dev_res.status_code == 200

    # Verify all frontend JS modules and screen assets
    modules = [
        "state.js",
        "api.js",
        "audio-engine.js",
        "voice-orb.js",
        "waveform.js",
        "ui.js",
        "screens/overview.js",
        "screens/live-calls.js",
        "screens/call-history.js",
        "screens/ai-assistant.js",
        "screens/knowledge-base.js",
        "screens/contacts.js",
        "screens/analytics.js",
        "screens/settings.js",
        "onboarding.js",
        "main.js",
    ]
    for mod in modules:
        mod_res = client.get(f"/static/js/{mod}")
        assert mod_res.status_code == 200, f"Module {mod} failed to load"
        assert len(mod_res.text) > 50, f"Module {mod} content too short"
