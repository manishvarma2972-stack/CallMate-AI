"""Gemini Live Voice Engine managing bidirectional asynchronous streaming.

Interacts solely through the transport-agnostic AudioStreamBridge.
"""

import asyncio
import logging
from typing import Any, Optional
from google import genai
from google.genai import types

from app.core.config import Settings, get_settings
from app.core.errors import GeminiLiveError
from app.engine.bridge import AudioStreamBridge
from app.engine.prompts import build_system_instruction
from app.engine.tools import ToolDispatcher

logger = logging.getLogger("app.engine.gemini_live")


class GeminiLiveEngine:
    """Manages an active Google Gemini 3.8 Live bidirectional session."""

    def __init__(
        self,
        bridge: AudioStreamBridge,
        settings: Optional[Settings] = None,
        tool_dispatcher: Optional[ToolDispatcher] = None,
        client: Optional[genai.Client] = None,
    ) -> None:
        self.bridge = bridge
        self.settings = settings or get_settings()
        self.tool_dispatcher = tool_dispatcher or ToolDispatcher()
        self._client = client or genai.Client(
            api_key=self.settings.GEMINI_API_KEY.get_secret_value()
        )
        self._inbound_task: Optional[asyncio.Task] = None
        self._outbound_task: Optional[asyncio.Task] = None
        self._is_running = False

    def build_connect_config(self) -> types.LiveConnectConfig:
        """Construct the typed LiveConnectConfig for gemini-3.8-live."""
        system_instruction_text = build_system_instruction(self.settings)

        return types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            temperature=self.settings.GEMINI_TEMPERATURE,
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=self.settings.GEMINI_VOICE_NAME
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part.from_text(text=system_instruction_text)]
            ),
            tools=self.tool_dispatcher.get_declarations(),
        )

    async def run(self) -> None:
        """Establish the live connection and run concurrent stream loops until stopped."""
        config = self.build_connect_config()
        self._is_running = True

        logger.info(
            "Connecting to Gemini Live API: model=%s session_id=%s voice=%s",
            self.settings.GEMINI_MODEL,
            self.bridge.session_id,
            self.settings.GEMINI_VOICE_NAME,
        )

        try:
            async with self._client.aio.live.connect(model=self.settings.GEMINI_MODEL, config=config) as session:
                logger.info("Gemini Live session connected: session_id=%s", self.bridge.session_id)
                await self.bridge.send_control_event(event="session_ready", action="start_audio")

                # Run concurrent inbound and outbound streaming tasks
                self._inbound_task = asyncio.create_task(
                    self._inbound_stream_loop(session),
                    name=f"gemini_inbound_{self.bridge.session_id}",
                )
                self._outbound_task = asyncio.create_task(
                    self._outbound_stream_loop(session),
                    name=f"gemini_outbound_{self.bridge.session_id}",
                )

                # Wait until one of the tasks terminates or raises
                done, pending = await asyncio.wait(
                    [self._inbound_task, self._outbound_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )

                for t in pending:
                    t.cancel()

                # Re-raise exceptions from completed tasks if any
                for t in done:
                    if not t.cancelled() and t.exception():
                        raise t.exception()

        except asyncio.CancelledError:
            logger.info("Gemini Live session cancelled: session_id=%s", self.bridge.session_id)
        except Exception as exc:
            logger.error("Gemini Live session error: session_id=%s error=%s", self.bridge.session_id, str(exc))
            raise GeminiLiveError(f"Gemini Live session failed: {str(exc)}") from exc
        finally:
            self._is_running = False
            self.bridge.close()
            logger.info("Gemini Live session closed: session_id=%s", self.bridge.session_id)

    async def _inbound_stream_loop(self, session: Any) -> None:
        """Stream raw 16kHz PCM audio from the bridge into Gemini Live."""
        try:
            while self._is_running:
                pcm_chunk = await self.bridge.read_inbound_pcm()
                if not pcm_chunk:
                    break

                # Send 16kHz PCM audio frame to Gemini
                await session.send_realtime_input(
                    audio=types.Blob(
                        data=pcm_chunk,
                        mime_type="audio/pcm;rate=16000",
                    )
                )
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Inbound audio streaming failed: session_id=%s error=%s", self.bridge.session_id, str(exc))
            raise

    async def _outbound_stream_loop(self, session: Any) -> None:
        """Receive multimodal events from Gemini Live and route to bridge and tool dispatcher."""
        try:
            async for message in session.receive():
                if not self._is_running:
                    break

                # 1. Process server content (audio, text, interruption, turn boundaries)
                server_content = getattr(message, "server_content", None)
                if server_content:
                    # User barge-in / interruption
                    if getattr(server_content, "interrupted", False):
                        await self.bridge.flush_playback_buffers()

                    # Spoken audio chunks and transcript parts
                    model_turn = getattr(server_content, "model_turn", None)
                    if model_turn:
                        for part in getattr(model_turn, "parts", []):
                            inline_data = getattr(part, "inline_data", None)
                            if inline_data and getattr(inline_data, "data", None):
                                await self.bridge.write_outbound_audio(inline_data.data)

                            text = getattr(part, "text", None)
                            if text:
                                await self.bridge.record_transcript(text)

                    # Turn complete marker
                    if getattr(server_content, "turn_complete", False):
                        await self.bridge.mark_turn_complete()

                # 2. Process function/tool calls (blocking from Gemini perspective)
                tool_call = getattr(message, "tool_call", None)
                if tool_call:
                    function_calls = getattr(tool_call, "function_calls", [])
                    function_responses = []

                    for call in function_calls:
                        call_name = getattr(call, "name", "")
                        call_id = getattr(call, "id", "")
                        call_args = getattr(call, "args", {}) or {}

                        logger.info(
                            "Gemini function call received: name=%s id=%s session_id=%s",
                            call_name,
                            call_id,
                            self.bridge.session_id,
                        )

                        await self.bridge.send_control_event(
                            event="tool_call",
                            action="invoke",
                            details={"name": call_name, "args": call_args},
                        )

                        # Execute tool asynchronously without stalling receiver loop
                        result = await self.tool_dispatcher.execute(
                            session_id=self.bridge.session_id,
                            name=call_name,
                            args=call_args,
                        )

                        await self.bridge.send_control_event(
                            event="tool_result",
                            action="complete",
                            details={"name": call_name, "result": result},
                        )

                        function_responses.append(
                            types.FunctionResponse(
                                name=call_name,
                                id=call_id,
                                response={"result": result},
                            )
                        )

                    # Send correlated function responses back to Gemini
                    if function_responses:
                        await session.send_tool_response(function_responses=function_responses)

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Outbound event loop failed: session_id=%s error=%s", self.bridge.session_id, str(exc))
            raise

    def stop(self) -> None:
        """Signal tasks to terminate."""
        self._is_running = False
        if self._inbound_task and not self._inbound_task.done():
            self._inbound_task.cancel()
        if self._outbound_task and not self._outbound_task.done():
            self._outbound_task.cancel()
