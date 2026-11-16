"""Health monitoring service providing real-time process telemetry and diagnostics."""

from datetime import datetime, timezone
import os
import platform
import resource
import sys
import time
from typing import Optional
from fastapi import Request

from app.core.config import Settings, get_settings
from app.schemas.health import MemoryMetrics, SystemHealthResponse


class HealthService:
    """Collects real-time diagnostic indicators for process health monitoring."""

    # Static process-level startup tracker
    _process_startup_monotonic: float = time.monotonic()
    _process_startup_datetime: datetime = datetime.now(timezone.utc)

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self._settings = settings or get_settings()

    @classmethod
    def mark_startup(cls) -> None:
        """Record process initialization timestamp."""
        cls._process_startup_monotonic = time.monotonic()
        cls._process_startup_datetime = datetime.now(timezone.utc)

    def get_memory_metrics(self) -> MemoryMetrics:
        """Sample current process resident memory using system resource usage."""
        try:
            usage = resource.getrusage(resource.RUSAGE_SELF)
            raw_rss = usage.ru_maxrss

            # On macOS (Darwin), ru_maxrss is reported in bytes.
            # On Linux (including Docker containers), ru_maxrss is reported in kilobytes.
            if platform.system() == "Darwin":
                bytes_rss = int(raw_rss)
            else:
                bytes_rss = int(raw_rss * 1024)

            mb_rss = round(bytes_rss / (1024.0 * 1024.0), 2)
            return MemoryMetrics(rss_mb=mb_rss, rss_bytes=bytes_rss)
        except Exception:
            return MemoryMetrics(rss_mb=0.0, rss_bytes=0)

    def get_system_health(self) -> SystemHealthResponse:
        """Generate comprehensive live application health report."""
        current_monotonic = time.monotonic()
        uptime_seconds = round(max(0.0, current_monotonic - self._process_startup_monotonic), 2)
        memory_metrics = self.get_memory_metrics()

        return SystemHealthResponse(
            status="healthy",
            app_name=self._settings.APP_NAME,
            environment=self._settings.ENVIRONMENT.value,
            version=self._settings.APP_VERSION,
            uptime_seconds=uptime_seconds,
            timestamp=datetime.now(timezone.utc),
            python_version=sys.version.split()[0],
            process_id=os.getpid(),
            memory=memory_metrics,
        )


def get_health_service(request: Request) -> HealthService:
    """Dependency provider for HealthService bound to request application state."""
    settings = getattr(request.app.state, "settings", None) or get_settings()
    return HealthService(settings=settings)
