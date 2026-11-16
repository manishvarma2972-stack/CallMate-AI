"""Audio processing, framing, and PCM stream validation."""

import logging
from typing import Generator, List

logger = logging.getLogger("app.engine.audio")

# 16 kHz, 16-bit Mono PCM: 16000 samples/sec * 2 bytes/sample = 32,000 bytes/sec
# A 20ms frame = 0.02 * 32,000 = 640 bytes (320 samples)
INBOUND_SAMPLE_RATE: int = 16000
INBOUND_BYTES_PER_SAMPLE: int = 2
INBOUND_FRAME_MS: int = 20
INBOUND_FRAME_BYTES: int = int(INBOUND_SAMPLE_RATE * (INBOUND_FRAME_MS / 1000.0) * INBOUND_BYTES_PER_SAMPLE)  # 640 bytes

OUTBOUND_SAMPLE_RATE: int = 24000
OUTBOUND_BYTES_PER_SAMPLE: int = 2


class AudioProcessor:
    """Validates raw Linear PCM audio streams and segments them into uniform frames."""

    def __init__(self, frame_bytes: int = INBOUND_FRAME_BYTES) -> None:
        self.frame_bytes = frame_bytes
        self._residual_buffer = bytearray()

    def validate_pcm16_chunk(self, chunk: bytes) -> bool:
        """Validate that raw bytes represent a valid 16-bit PCM stream."""
        if not isinstance(chunk, (bytes, bytearray)):
            return False
        # 16-bit PCM samples require an even number of bytes
        return len(chunk) % 2 == 0

    def process_inbound_bytes(self, chunk: bytes) -> List[bytes]:
        """Ingest arbitrary byte chunks and return uniform 20ms PCM frames."""
        if not self.validate_pcm16_chunk(chunk):
            logger.warning("Received misaligned PCM chunk of length %d bytes; dropping chunk", len(chunk))
            return []

        self._residual_buffer.extend(chunk)
        frames: List[bytes] = []

        while len(self._residual_buffer) >= self.frame_bytes:
            frame = bytes(self._residual_buffer[:self.frame_bytes])
            frames.append(frame)
            del self._residual_buffer[:self.frame_bytes]

        return frames

    def flush_residual(self) -> bytes:
        """Flush any remaining residual bytes in the buffer."""
        remaining = bytes(self._residual_buffer)
        self._residual_buffer.clear()
        return remaining
