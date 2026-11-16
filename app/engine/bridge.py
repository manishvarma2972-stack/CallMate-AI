"""AudioStreamBridge decouples the Gemini Live engine from the WebSocket transport layer.

Provides thread-safe async queues for audio frames and out-of-band control events.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("app.engine.bridge")


class AudioStreamBridge:
    """Bidirectional asynchronous bridge decoupling audio transport from AI generation."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.inbound_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=500)
        self.outbound_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=500)
        self.control_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=100)
        self.transcript_buffer: List[str] = []
        self._is_closed = False

    async def push_inbound_pcm(self, pcm_bytes: bytes) -> None:
        """Enqueue raw PCM audio received from client/telephony adapter."""
        if not self._is_closed and pcm_bytes:
            try:
                self.inbound_queue.put_nowait(pcm_bytes)
            except asyncio.QueueFull:
                logger.warning("Inbound audio queue full for session %s; dropping frame", self.session_id)

    async def read_inbound_pcm(self) -> bytes:
        """Read the next audio frame destined for Gemini Live."""
        return await self.inbound_queue.get()

    async def write_outbound_audio(self, pcm_bytes: bytes) -> None:
        """Enqueue synthesized PCM audio from Gemini Live destined for client playback."""
        if not self._is_closed and pcm_bytes:
            try:
                self.outbound_queue.put_nowait(pcm_bytes)
            except asyncio.QueueFull:
                logger.warning("Outbound audio queue full for session %s; dropping frame", self.session_id)

    async def read_outbound_audio(self) -> bytes:
        """Read the next synthesized audio frame destined for client playback."""
        return await self.outbound_queue.get()

    async def flush_playback_buffers(self) -> None:
        """Instantaneously drain pending outbound audio buffers upon barge-in/interruption."""
        dropped_count = 0
        while not self.outbound_queue.empty():
            try:
                self.outbound_queue.get_nowait()
                dropped_count += 1
            except asyncio.QueueEmpty:
                break

        logger.info(
            "Barge-in: Flushed %d pending outbound audio frames for session %s",
            dropped_count,
            self.session_id,
        )

        # Notify downstream client/telephony adapter to silence playback immediately
        await self.send_control_event(
            event="interrupted",
            action="flush_buffer",
            details={"dropped_frames": dropped_count},
        )

    async def send_control_event(self, event: str, action: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Dispatch control signaling over the control bus."""
        payload = {
            "type": "control",
            "event": event,
            "action": action,
            "details": details or {},
        }
        try:
            self.control_queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass

    async def record_transcript(self, text: str) -> None:
        """Append partial transcription chunk."""
        if text:
            self.transcript_buffer.append(text)
            await self.send_control_event(
                event="transcript",
                action="append",
                details={"text": text},
            )

    async def mark_turn_complete(self) -> None:
        """Signal completion of an AI speaking turn."""
        await self.send_control_event(event="turn_complete", action="none")

    def close(self) -> None:
        """Mark bridge closed and release queue consumers."""
        self._is_closed = True
