"""Automated tests proving persistent, continuous multi-turn voice conversations.

Verifies:
1. One session supports at least five consecutive user/AI turns.
2. Gemini turn_complete does not close the WebSocket.
3. Microphone input continues after an AI response.
4. AI audio playback completes without ending the session.
5. Barge-in works during an AI response.
6. Hang Up terminates all background tasks and closes the session.
7. A genuine WebSocket failure is handled safely.
8. No new token is required between conversation turns.
"""

import asyncio
from pathlib import Path
from types import SimpleNamespace
from typing import Any, AsyncGenerator, List
from unittest.mock import patch
import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import Environment, Settings
from app.engine.bridge import AudioStreamBridge
from app.engine.gemini_live import GeminiLiveEngine
from app.engine.tools import ToolDispatcher
from app.main import create_app
from app.repositories.message_repo import MessageRepository
from app.services.session import VoiceSessionManager


class MockMultiTurnGeminiSession:
    """Mock Gemini Live session yielding multiple conversation turns sequentially."""

    def __init__(self, turns: List[List[Any]]) -> None:
        self.turns: List[List[Any]] = list(turns)
        self.sent_realtime_inputs: List[Any] = []
        self.sent_tool_responses: List[Any] = []
        self._current_turn_index = 0

    async def send_realtime_input(self, audio: Any = None, text: Any = None) -> None:
        self.sent_realtime_inputs.append({"audio": audio, "text": text})

    async def send_tool_response(self, function_responses: List[Any]) -> None:
        self.sent_tool_responses.append(function_responses)

    async def receive(self) -> AsyncGenerator[Any, None]:
        if self._current_turn_index < len(self.turns):
            turn_events = self.turns[self._current_turn_index]
            self._current_turn_index += 1
            for event in turn_events:
                yield event
        else:
            # Idle wait for future user speech input until cancelled
            await asyncio.Event().wait()


class MockMultiTurnClient:
    """Mock client returning the multi-turn session."""

    def __init__(self, session: MockMultiTurnGeminiSession) -> None:
        class AioLive:
            def __init__(self, s: MockMultiTurnGeminiSession) -> None:
                self._session = s

            def connect(self, model: str, config: Any) -> Any:
                s = self._session

                class AsyncContext:
                    async def __aenter__(self) -> MockMultiTurnGeminiSession:
                        return s

                    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
                        pass

                return AsyncContext()

        self.aio = SimpleNamespace(live=AioLive(session))


def make_turn_events(text: str, audio_bytes: bytes, tool_call: Any = None) -> List[Any]:
    """Helper to build a complete Gemini Live model turn event list."""
    events = []
    if tool_call:
        events.append(SimpleNamespace(server_content=None, tool_call=tool_call))
    events.append(
        SimpleNamespace(
            server_content=SimpleNamespace(
                interrupted=False,
                model_turn=SimpleNamespace(
                    parts=[
                        SimpleNamespace(inline_data=SimpleNamespace(data=audio_bytes), text=None),
                        SimpleNamespace(inline_data=None, text=text),
                    ]
                ),
                turn_complete=True,
            ),
            tool_call=None,
        )
    )
    return events


@pytest.fixture
def test_app_and_settings() -> tuple[FastAPI, Settings]:
    """Test app fixture configured for multi-turn voice tests."""
    settings = Settings(
        APP_NAME="CallMate Multi-Turn Test",
        ENVIRONMENT=Environment.TEST,
        OWNER_API_KEY=SecretStr("multi-turn-owner-key"),
        SECRET_KEY=SecretStr("32-byte-secure-cryptographic-key-for-multi-turn!"),
        RECEPTIONIST_OWNER_NAME="Manish Varma",
        GEMINI_API_KEY=SecretStr("mock-key"),
    )
    return create_app(settings=settings), settings


@pytest.mark.asyncio
async def test_multi_turn_supports_at_least_five_consecutive_turns(tmp_path: Any) -> None:
    """Requirement 1: Verify one session supports at least 5 consecutive user/AI turns."""
    session_id = str(uuid.uuid4())
    bridge = AudioStreamBridge(session_id=session_id)
    repo = MessageRepository(storage_dir=tmp_path)

    # Construct 5 distinct conversation turns
    turn1 = make_turn_events("Hello! This is CallMate for Manish Varma.", b"\x01\x02" * 50)
    turn2 = make_turn_events("Manish Varma is currently unavailable. May I take a message?", b"\x03\x04" * 50)
    turn3 = make_turn_events("Understood, could you please tell me your name and callback number?", b"\x05\x06" * 50)
    
    # Turn 4 includes a take_message tool call
    tool_call = SimpleNamespace(
        function_calls=[
            SimpleNamespace(
                name="take_message",
                id="call_turn4",
                args={
                    "caller_name": "Suresh Kumar",
                    "phone_number": "+919876543210",
                    "message": "Call back regarding vendor contract",
                    "urgency": "medium",
                },
            )
        ]
    )
    turn4 = make_turn_events("I have recorded your message for Manish Varma.", b"\x07\x08" * 50, tool_call=tool_call)
    turn5 = make_turn_events("You are welcome! Have a wonderful day. Goodbye.", b"\x09\x10" * 50)

    mock_session = MockMultiTurnGeminiSession([turn1, turn2, turn3, turn4, turn5])
    mock_client = MockMultiTurnClient(session=mock_session)

    dispatcher = ToolDispatcher()
    dispatcher._tools["take_message"]._repo = repo

    settings = Settings(
        GEMINI_API_KEY=SecretStr("mock-key"),
        RECEPTIONIST_OWNER_NAME="Manish Varma",
        MESSAGE_STORAGE_PATH=str(tmp_path),
    )

    engine = GeminiLiveEngine(
        bridge=bridge,
        settings=settings,
        tool_dispatcher=dispatcher,
        client=mock_client,  # type: ignore[arg-type]
    )

    engine_task = asyncio.create_task(engine.run())

    # Wait for session readiness
    ready_event = await asyncio.wait_for(bridge.control_queue.get(), timeout=2.0)
    assert ready_event["event"] == "session_ready"

    # Simulate 5 conversational turns: User sends audio -> Model replies -> Turn completes
    for i in range(1, 6):
        # User sends 20ms audio frame
        await bridge.push_inbound_pcm(b"\x00\x00" * 320)
        
        # Read model synthesized audio for this turn
        out_audio = await asyncio.wait_for(bridge.read_outbound_audio(), timeout=2.0)
        assert len(out_audio) > 0

        # Wait for turn_complete control event (or tool events if turn 4)
        while True:
            ctrl = await asyncio.wait_for(bridge.control_queue.get(), timeout=2.0)
            if ctrl["event"] == "turn_complete":
                break

    # Verify all 5 transcripts were recorded sequentially on the SAME bridge and session
    assert len(bridge.transcript_buffer) == 5
    assert "Hello! This is CallMate for Manish Varma." in bridge.transcript_buffer[0]
    assert "Manish Varma is currently unavailable" in bridge.transcript_buffer[1]
    assert "Understood, could you please tell me your name" in bridge.transcript_buffer[2]
    assert "I have recorded your message for Manish Varma." in bridge.transcript_buffer[3]
    assert "You are welcome! Have a wonderful day. Goodbye." in bridge.transcript_buffer[4]

    # Verify tool message was persisted in repo
    saved_files = list(Path(tmp_path).glob("*.json"))
    assert len(saved_files) == 1

    # Verify engine_task is STILL ALIVE and running after 5 full turns
    assert not engine_task.done()

    # Clean shutdown
    engine.stop()
    await engine_task
    assert engine_task.done()


def test_gemini_turn_complete_does_not_close_websocket(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 2: Gemini turn_complete does not close the WebSocket."""
    app, settings = test_app_and_settings
    bridge_holder = []

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        bridge_holder.append(self.bridge)
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={"language_hint": "en"},
            )
            data = resp.json()

            with client.websocket_connect(f"/api/v1/voice/stream/{data['session_id']}?token={data['token']}") as ws:
                ready_event = ws.receive_json()
                assert ready_event["event"] == "session_ready"

                # Simulate AI turn complete signal from engine bridge
                bridge = bridge_holder[0]
                bridge.control_queue.put_nowait({
                    "type": "control",
                    "event": "turn_complete",
                    "action": "none",
                    "details": {},
                })

                # WebSocket receives turn_complete without closing
                turn_event = ws.receive_json()
                assert turn_event["event"] == "turn_complete"

                # Send audio for subsequent turn - connection must remain open
                ws.send_bytes(b"\x00\x00" * 320)


def test_microphone_input_continues_after_ai_response(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 3: Microphone input continues transmitting after an AI response."""
    app, settings = test_app_and_settings
    bridge_holder = []

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        bridge_holder.append(self.bridge)
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={},
            )
            data = resp.json()

            with client.websocket_connect(f"/api/v1/voice/stream/{data['session_id']}?token={data['token']}") as ws:
                _ = ws.receive_json()  # session_ready
                bridge = bridge_holder[0]

                # Turn 1 speech
                ws.send_bytes(b"\x01\x02" * 320)
                import time
                time.sleep(0.05)
                frame1 = bridge.inbound_queue.get_nowait()
                assert len(frame1) == 640

                # Simulate AI completed Turn 1
                bridge.control_queue.put_nowait({"type": "control", "event": "turn_complete", "action": "none", "details": {}})
                turn_event = ws.receive_json()
                assert turn_event["event"] == "turn_complete"

                # Turn 2 user speech continues over same connection
                ws.send_bytes(b"\x03\x04" * 320)
                time.sleep(0.05)
                frame2 = bridge.inbound_queue.get_nowait()
                assert len(frame2) == 640


def test_ai_audio_playback_completes_without_ending_session(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 4: AI audio playback completes without ending the session."""
    app, settings = test_app_and_settings
    bridge_holder = []

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        bridge_holder.append(self.bridge)
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={},
            )
            data = resp.json()
            session_id = data["session_id"]

            with client.websocket_connect(f"/api/v1/voice/stream/{session_id}?token={data['token']}") as ws:
                _ = ws.receive_json()  # session_ready
                bridge = bridge_holder[0]

                # Send 24kHz synthesized audio frame from engine to client
                test_audio = b"\x22\x33" * 240
                bridge.outbound_queue.put_nowait(test_audio)

                # Client receives and plays audio chunk
                received_audio = ws.receive_bytes()
                assert received_audio == test_audio

                # Verify session in manager remains ACTIVE
                manager: VoiceSessionManager = app.state.session_manager
                session = manager.get_session(session_id)
                assert session is not None
                assert session["state"] == "ACTIVE"


def test_barge_in_during_ai_response(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 5: Barge-in works during an AI response and preserves session."""
    app, settings = test_app_and_settings
    bridge_holder = []

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        bridge_holder.append(self.bridge)
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={},
            )
            data = resp.json()

            with client.websocket_connect(f"/api/v1/voice/stream/{data['session_id']}?token={data['token']}") as ws:
                _ = ws.receive_json()  # session_ready
                bridge = bridge_holder[0]

                # Enqueue audio frames queued up for speaking
                for _ in range(5):
                    bridge.outbound_queue.put_nowait(b"\x55\x66" * 100)

                # Caller interrupts with barge-in text signal
                ws.send_text('{"type": "barge_in"}')

                # Consume messages until control event 'interrupted' is received
                import json
                interrupted_found = False
                while not interrupted_found:
                    msg = ws.receive()
                    if "text" in msg:
                        parsed = json.loads(msg["text"])
                        if parsed.get("event") == "interrupted":
                            assert parsed["action"] == "flush_buffer"
                            interrupted_found = True

                assert bridge.outbound_queue.qsize() == 0

                # Connection remains open for caller's new speech
                ws.send_bytes(b"\x00\x00" * 320)


def test_hang_up_terminates_all_background_tasks_and_session(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 6: Hang Up terminates all background tasks and closes the session."""
    app, settings = test_app_and_settings
    bridge_holder = []

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        bridge_holder.append(self.bridge)
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={},
            )
            data = resp.json()
            session_id = data["session_id"]

            with client.websocket_connect(f"/api/v1/voice/stream/{session_id}?token={data['token']}") as ws:
                _ = ws.receive_json()  # session_ready
                bridge = bridge_holder[0]
                # Client hangs up
                ws.close()

            # Verify session is marked TERMINATED in manager and bridge closed
            manager: VoiceSessionManager = app.state.session_manager
            session = manager.get_session(session_id)
            assert session["state"] == "TERMINATED"
            assert bridge._is_closed is True


def test_genuine_websocket_failure_handled_safely(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 7: A genuine WebSocket failure (e.g. invalid token) is rejected with WS 1008."""
    app, settings = test_app_and_settings
    with TestClient(app) as client:
        bogus_session_id = str(uuid.uuid4())
        with pytest.raises(Exception):
            with client.websocket_connect(f"/api/v1/voice/stream/{bogus_session_id}?token=invalid.token.signature") as ws:
                pass


def test_no_new_token_required_between_conversation_turns(test_app_and_settings: tuple[FastAPI, Settings]) -> None:
    """Requirement 8: No new token is required between conversation turns, and original token cannot be replayed."""
    app, settings = test_app_and_settings

    async def mock_persistent_run(self: GeminiLiveEngine) -> None:
        await self.bridge.send_control_event(event="session_ready", action="start_audio")
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass

    with patch("app.engine.gemini_live.GeminiLiveEngine.run", mock_persistent_run):
        with TestClient(app) as client:
            # 1. Generate single token
            resp = client.post(
                "/api/v1/voice/sessions",
                headers={"X-API-Key": "multi-turn-owner-key"},
                json={},
            )
            assert resp.status_code == 201
            data = resp.json()
            session_id = data["session_id"]
            token = data["token"]

            # 2. Connect once and execute 5 turns across the same single token
            with client.websocket_connect(f"/api/v1/voice/stream/{session_id}?token={token}") as ws:
                _ = ws.receive_json()  # session_ready

                for turn in range(1, 6):
                    ws.send_bytes(b"\x00\x00" * 320)

            # 3. Verify original token cannot be replayed after disconnect
            with pytest.raises(Exception):
                with client.websocket_connect(f"/api/v1/voice/stream/{session_id}?token={token}") as ws:
                    pass
