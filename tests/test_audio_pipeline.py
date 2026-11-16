"""Automated tests for audio framing, PCM chunking, and stream validation."""

import pytest
from app.engine.audio import (
    INBOUND_FRAME_BYTES,
    AudioProcessor,
)


def test_audio_processor_exact_frame() -> None:
    """Verify that an exact 20ms 16kHz PCM chunk (640 bytes) yields exactly one frame."""
    processor = AudioProcessor()
    chunk = b"\x00\x01" * 320  # 640 bytes (320 16-bit samples)
    assert len(chunk) == INBOUND_FRAME_BYTES

    frames = processor.process_inbound_bytes(chunk)
    assert len(frames) == 1
    assert len(frames[0]) == INBOUND_FRAME_BYTES
    assert frames[0] == chunk


def test_audio_processor_multiple_frames() -> None:
    """Verify that a double-length chunk (1280 bytes) is segmented into two 640-byte frames."""
    processor = AudioProcessor()
    chunk = b"\x12\x34" * 640  # 1280 bytes

    frames = processor.process_inbound_bytes(chunk)
    assert len(frames) == 2
    assert len(frames[0]) == INBOUND_FRAME_BYTES
    assert len(frames[1]) == INBOUND_FRAME_BYTES


def test_audio_processor_sub_frame_buffering() -> None:
    """Verify that smaller chunks are accumulated until a full 20ms frame is ready."""
    processor = AudioProcessor()
    # 400 bytes (sub-frame)
    first_chunk = b"\xaa\xbb" * 200
    frames_1 = processor.process_inbound_bytes(first_chunk)
    assert len(frames_1) == 0

    # 300 bytes (400 + 300 = 700 bytes -> 1 frame of 640 bytes + 60 bytes residual)
    second_chunk = b"\xcc\xdd" * 150
    frames_2 = processor.process_inbound_bytes(second_chunk)
    assert len(frames_2) == 1
    assert len(frames_2[0]) == INBOUND_FRAME_BYTES

    # Flush residual
    residual = processor.flush_residual()
    assert len(residual) == 60


def test_audio_processor_rejects_odd_bytes() -> None:
    """Verify that misaligned PCM chunks with odd byte length are detected and dropped."""
    processor = AudioProcessor()
    odd_chunk = b"\x01\x02\x03"  # 3 bytes (impossible for 16-bit PCM)
    assert not processor.validate_pcm16_chunk(odd_chunk)

    frames = processor.process_inbound_bytes(odd_chunk)
    assert len(frames) == 0
