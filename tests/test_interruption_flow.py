"""Automated tests for barge-in interruption, buffer purging, and flush control signaling."""

import asyncio
import uuid
import pytest

from app.engine.bridge import AudioStreamBridge


@pytest.mark.asyncio
async def test_interruption_drains_outbound_queue() -> None:
    """Verify that triggering interruption flushes all pending audio packets immediately."""
    session_id = str(uuid.uuid4())
    bridge = AudioStreamBridge(session_id=session_id)

    # Enqueue 5 audio packets (simulating ongoing speech synthesis buffered for playback)
    for i in range(5):
        await bridge.write_outbound_audio(b"\xaa\xbb" * 100)

    assert bridge.outbound_queue.qsize() == 5

    # Simulate barge-in / interruption
    await bridge.flush_playback_buffers()

    # Outbound queue must now be completely empty
    assert bridge.outbound_queue.empty()
    assert bridge.outbound_queue.qsize() == 0

    # Control queue must receive flush_buffer instruction
    control_event = await bridge.control_queue.get()
    assert control_event["type"] == "control"
    assert control_event["event"] == "interrupted"
    assert control_event["action"] == "flush_buffer"
    assert control_event["details"]["dropped_frames"] == 5
