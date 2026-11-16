"""Automated tests for Gemini Live event processing, audio routing, and function calling."""

import asyncio
from types import SimpleNamespace
from typing import Any, AsyncGenerator, Dict, List
import uuid
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.engine.bridge import AudioStreamBridge
from app.engine.gemini_live import GeminiLiveEngine
from app.engine.tools import ToolDispatcher
from app.repositories.message_repo import MessageRepository


class MockGeminiSession:
    """Mock asynchronous Gemini Live bidirectional session."""

    def __init__(self, incoming_events: List[Any]) -> None:
        self.incoming_events = incoming_events
        self.sent_realtime_inputs: List[Any] = []
        self.sent_tool_responses: List[Any] = []

    async def send_realtime_input(self, audio: Any = None, text: Any = None) -> None:
        self.sent_realtime_inputs.append({"audio": audio, "text": text})

    async def send_tool_response(self, function_responses: List[Any]) -> None:
        self.sent_tool_responses.append(function_responses)

    async def receive(self) -> AsyncGenerator[Any, None]:
        if self.incoming_events:
            events = list(self.incoming_events)
            self.incoming_events.clear()
            for event in events:
                yield event
        else:
            # Emulate real live websocket awaiting next user speech turn
            await asyncio.Event().wait()


class MockGenAIClient:
    """Mock client implementing aio.live.connect()."""

    def __init__(self, mock_session: MockGeminiSession) -> None:
        self.mock_session = mock_session

        class AioLive:
            def __init__(self, session: MockGeminiSession) -> None:
                self._session = session

            def connect(self, model: str, config: Any) -> Any:
                session = self._session

                class AsyncContext:
                    async def __aenter__(self) -> MockGeminiSession:
                        return session

                    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
                        pass

                return AsyncContext()

        self.aio = SimpleNamespace(live=AioLive(mock_session))


@pytest.mark.asyncio
async def test_gemini_event_processing_audio_and_text(tmp_path: Any) -> None:
    """Verify that audio bytes and text transcript tokens from Gemini are routed correctly."""
    session_id = str(uuid.uuid4())
    bridge = AudioStreamBridge(session_id=session_id)

    # Simulated audio part (24kHz PCM bytes) and text transcript part
    test_pcm = b"\x11\x22" * 100
    mock_events = [
        SimpleNamespace(
            server_content=SimpleNamespace(
                interrupted=False,
                model_turn=SimpleNamespace(
                    parts=[
                        SimpleNamespace(inline_data=SimpleNamespace(data=test_pcm), text=None),
                        SimpleNamespace(inline_data=None, text="Hello, how can I help you?"),
                    ]
                ),
                turn_complete=True,
            ),
            tool_call=None,
        )
    ]

    mock_session = MockGeminiSession(incoming_events=mock_events)
    mock_client = MockGenAIClient(mock_session=mock_session)

    settings = Settings(
        GEMINI_API_KEY=SecretStr("mock-key"),
        RECEPTIONIST_OWNER_NAME="Owner",
        MESSAGE_STORAGE_PATH=str(tmp_path),
    )

    engine = GeminiLiveEngine(
        bridge=bridge,
        settings=settings,
        client=mock_client,  # type: ignore[arg-type]
    )

    # Run engine briefly
    engine_task = asyncio.create_task(engine.run())
    await asyncio.sleep(0.05)
    engine.stop()
    await engine_task

    # Verify audio was routed to bridge outbound queue
    outbound_audio = await bridge.read_outbound_audio()
    assert outbound_audio == test_pcm

    # Verify transcript was recorded
    assert "Hello, how can I help you?" in bridge.transcript_buffer


@pytest.mark.asyncio
async def test_gemini_function_calling_take_message(tmp_path: Any) -> None:
    """Verify function calling flow: execution, persistence, and correlated response dispatch."""
    session_id = str(uuid.uuid4())
    bridge = AudioStreamBridge(session_id=session_id)
    repo = MessageRepository(storage_dir=tmp_path)

    call_id = "call_abc123"
    mock_events = [
        SimpleNamespace(
            server_content=None,
            tool_call=SimpleNamespace(
                function_calls=[
                    SimpleNamespace(
                        name="take_message",
                        id=call_id,
                        args={
                            "caller_name": "Anita Rao",
                            "phone_number": "+919848012345",
                            "message": "Discuss conference schedule",
                            "urgency": "high",
                        },
                    )
                ]
            ),
        )
    ]

    mock_session = MockGeminiSession(incoming_events=mock_events)
    mock_client = MockGenAIClient(mock_session=mock_session)

    settings = Settings(
        GEMINI_API_KEY=SecretStr("mock-key"),
        RECEPTIONIST_OWNER_NAME="Owner",
        MESSAGE_STORAGE_PATH=str(tmp_path),
    )

    dispatcher = ToolDispatcher(tools=None)
    dispatcher._tools["take_message"]._repo = repo  # inject isolated test repo

    engine = GeminiLiveEngine(
        bridge=bridge,
        settings=settings,
        tool_dispatcher=dispatcher,
        client=mock_client,  # type: ignore[arg-type]
    )

    engine_task = asyncio.create_task(engine.run())
    await asyncio.sleep(0.05)
    engine.stop()
    await engine_task

    # Verify tool response was sent back to Gemini
    assert len(mock_session.sent_tool_responses) == 1
    resp_batch = mock_session.sent_tool_responses[0]
    assert len(resp_batch) == 1
    tool_resp = resp_batch[0]

    assert tool_resp.name == "take_message"
    assert tool_resp.id == call_id
    assert tool_resp.response["result"]["status"] == "recorded"
    assert tool_resp.response["result"]["retryable"] is False
    assert "message_id" in tool_resp.response["result"]
    assert "recorded_at" in tool_resp.response["result"]

    # Verify real message exists in repo
    persisted = repo.get_message(tool_resp.response["result"]["message_id"])
    assert persisted is not None
    assert persisted["caller_name"] == "Anita Rao"
