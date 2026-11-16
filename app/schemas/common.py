"""Common shared schemas for API responses and error representations."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Encapsulates detailed error attributes."""

    code: str = Field(..., description="Machine-readable error code", examples=["NOT_FOUND"])
    message: str = Field(..., description="Human-readable error description")
    details: Optional[Any] = Field(default=None, description="Additional context or validation failure specifics")
    timestamp: datetime = Field(..., description="UTC ISO-8601 error generation timestamp")
    request_id: Optional[str] = Field(default=None, description="Unique correlation request identifier")


class ErrorResponse(BaseModel):
    """Standardized top-level error response envelope."""

    error: ErrorDetail
