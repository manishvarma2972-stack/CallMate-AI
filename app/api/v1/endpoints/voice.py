"""Voice session management and development WebSocket streaming gateway."""

import asyncio
import hmac
import logging
from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    Header,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.core.config import Settings, get_settings
from app.core.errors import VoiceAuthenticationError
from app.engine.audio import AudioProcessor
from app.engine.bridge import AudioStreamBridge
from app.engine.gemini_live import GeminiLiveEngine
from app.schemas.voice import VoiceSessionCreateRequest, VoiceSessionResponse
from app.services.session import VoiceSessionManager, get_session_manager

logger = logging.getLogger("app.api.v1.endpoints.voice")
router = APIRouter()


def get_active_settings(request: Request) -> Settings:
    """Resolve active application settings from app state or singleton."""
    return getattr(request.app.state, "settings", None) or get_settings()


def get_active_session_manager(request: Request) -> VoiceSessionManager:
    """Resolve active VoiceSessionManager bound to application state."""
    if not hasattr(request.app.state, "session_manager"):
        settings = get_active_settings(request)
        request.app.state.session_manager = VoiceSessionManager(settings=settings)
    return request.app.state.session_manager


@router.post(
    "/voice/sessions",
    response_model=VoiceSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision Authenticated Voice Session",
    description="Provisions a cryptographically signed single-use session token for real-time voice streaming.",
    tags=["Voice Streaming"],
)
def create_voice_session(
    request_data: VoiceSessionCreateRequest,
    req: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_active_settings),
    session_manager: VoiceSessionManager = Depends(get_active_session_manager),
) -> VoiceSessionResponse:
    """Authenticate owner API key and provision an authorized voice session."""
    # 1. Authenticate owner API key using constant-time comparison
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.OWNER_API_KEY.get_secret_value()):
        logger.warning("Unauthorized voice session creation attempt from client: %s", req.client.host if req.client else "unknown")
        raise VoiceAuthenticationError()

    # 2. Extract client identifier for rate limiting
    client_id = req.client.host if req.client else "unknown_client"

    # 3. Create cryptographically signed single-use session
    return session_manager.create_session(request=request_data, client_identifier=client_id)


@router.websocket("/voice/stream/{session_id}")
async def voice_stream_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(..., description="Cryptographic single-use session token"),
) -> None:
    """Authenticated development WebSocket endpoint for bidirectional audio streaming."""
    settings: Settings = getattr(websocket.app.state, "settings", None) or get_settings()
    if not hasattr(websocket.app.state, "session_manager"):
        websocket.app.state.session_manager = VoiceSessionManager(settings=settings)
    session_manager: VoiceSessionManager = websocket.app.state.session_manager

    # 1. Authenticate and atomically consume token under lock
    try:
        await session_manager.validate_and_consume_token(session_id=session_id, token_str=token)
    except Exception as exc:
        logger.warning("WebSocket authentication rejected for session %s: %s", session_id, str(exc))
        # Reject unauthorized handshake with Policy Violation (1008)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(exc))
        return

    # 2. Accept authorized WebSocket connection
    await websocket.accept()
    logger.info("Voice WebSocket connected: session_id=%s", session_id)

    audio_processor = AudioProcessor()
    bridge = AudioStreamBridge(session_id=session_id)
    engine = GeminiLiveEngine(bridge=bridge, settings=settings)

    engine_task = asyncio.create_task(engine.run(), name=f"engine_{session_id}")

    async def _client_to_bridge() -> None:
        """Receive binary PCM audio from client WebSocket and feed into bridge."""
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message and message["bytes"]:
                    raw_chunk = message["bytes"]
                    # Frame into 20ms chunks
                    frames = audio_processor.process_inbound_bytes(raw_chunk)
                    for frame in frames:
                        await bridge.push_inbound_pcm(frame)
                elif message.get("type") == "websocket.disconnect":
                    break
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    async def _bridge_to_client() -> None:
        """Receive synthesized audio & control events from bridge and send to client WebSocket."""
        try:
            while True:
                read_audio_task = asyncio.create_task(bridge.read_outbound_audio())
                read_control_task = asyncio.create_task(bridge.control_queue.get())

                done, pending = await asyncio.wait(
                    [read_audio_task, read_control_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for task in pending:
                    task.cancel()

                for task in done:
                    if task is read_audio_task and not task.cancelled():
                        audio_bytes = task.result()
                        if audio_bytes:
                            await websocket.send_bytes(audio_bytes)
                    elif task is read_control_task and not task.cancelled():
                        control_msg = task.result()
                        if control_msg:
                            await websocket.send_json(control_msg)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    receiver_task = asyncio.create_task(_client_to_bridge(), name=f"ws_rx_{session_id}")
    sender_task = asyncio.create_task(_bridge_to_client(), name=f"ws_tx_{session_id}")

    try:
        await asyncio.wait(
            [receiver_task, sender_task, engine_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
    finally:
        logger.info("Cleaning up voice WebSocket session: session_id=%s", session_id)
        for t in (receiver_task, sender_task, engine_task):
            t.cancel()
        engine.stop()
        bridge.close()
        session_manager.terminate_session(session_id)
        try:
            await websocket.close()
        except Exception:
            pass
