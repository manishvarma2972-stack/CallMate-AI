"""Pydantic schemas for the application health diagnostics endpoint."""

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class MemoryMetrics(BaseModel):
    """Process resident memory metrics."""

    rss_mb: float = Field(..., description="Resident Set Size in Megabytes", examples=[24.5])
    rss_bytes: int = Field(..., description="Resident Set Size in raw bytes", examples=[25690112])


class SystemHealthResponse(BaseModel):
    """System diagnostic and operational status payload."""

    status: Literal["healthy", "degraded", "unhealthy"] = Field(
        ...,
        description="Overall health status of the application",
        examples=["healthy"],
    )
    app_name: str = Field(..., description="Name of the running application", examples=["CallMate AI"])
    environment: str = Field(..., description="Application execution environment", examples=["development"])
    version: str = Field(..., description="Deployed semantic application version", examples=["0.1.0"])
    uptime_seconds: float = Field(..., description="Continuous process uptime in seconds", examples=[124.32])
    timestamp: datetime = Field(..., description="Current UTC timestamp when diagnostics were sampled")
    python_version: str = Field(..., description="Active Python runtime version", examples=["3.12.0"])
    process_id: int = Field(..., description="Operating system process ID", examples=[1234])
    memory: MemoryMetrics = Field(..., description="Current process memory consumption metrics")
