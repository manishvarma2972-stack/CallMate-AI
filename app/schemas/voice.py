"""Pydantic schemas for voice session authorization and WebSocket signaling."""

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class VoiceSessionCreateRequest(BaseModel):
    """Optional metadata payload when requesting a voice session."""

    caller_phone: Optional[str] = Field(default=None, description="Optional caller phone number if known ahead of time")
    language_hint: Optional[str] = Field(default="en", description="Optional language hint (e.g. en, te)")


class VoiceSessionResponse(BaseModel):
    """Authorized voice session connection parameters."""

    session_id: str = Field(..., description="Unique UUIDv4 session identifier")
    token: str = Field(..., description="Cryptographically signed single-use session token")
    expires_at: int = Field(..., description="Unix epoch timestamp when token expires")
    ws_url: str = Field(..., description="WebSocket connection URL for audio streaming")
    owner_name: str = Field(..., description="Configured owner display name")
    receptionist_name: str = Field(..., description="Display name of the AI caller assistant")


class TakeMessageSchema(BaseModel):
    """Validated input parameters for the take_message function tool."""

    caller_name: str = Field(..., min_length=1, description="Full name of the caller")
    phone_number: Optional[str] = Field(default=None, description="Callback telephone number")
    message: str = Field(..., min_length=1, description="Message content")
    urgency: Literal["low", "medium", "high", "urgent"] = Field(
        default="medium",
        description="Assessed urgency level",
    )
