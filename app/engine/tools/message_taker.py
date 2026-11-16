"""Tool declaration and execution for taking caller messages."""

from typing import Any, Dict, Optional
from google.genai import types
from pydantic import ValidationError

from app.engine.tools.base import BaseVoiceTool
from app.repositories.message_repo import MessageRepository, get_message_repository
from app.schemas.voice import TakeMessageSchema


class TakeMessageTool(BaseVoiceTool):
    """Voice tool for persisting caller messages via the MessageRepository."""

    def __init__(self, repository: Optional[MessageRepository] = None) -> None:
        self._repo = repository or get_message_repository()

    @property
    def declaration(self) -> types.FunctionDeclaration:
        """Return the typed Gemini FunctionDeclaration for take_message."""
        return types.FunctionDeclaration(
            name="take_message",
            description=(
                "Records and persists a message from the caller for the owner when they are unavailable. "
                "Call this tool only when the caller provides their name and message."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "caller_name": types.Schema(
                        type="STRING",
                        description="Full name of the caller",
                    ),
                    "phone_number": types.Schema(
                        type="STRING",
                        description="Callback phone number provided by the caller",
                    ),
                    "message": types.Schema(
                        type="STRING",
                        description="Detailed content or reason for the call",
                    ),
                    "urgency": types.Schema(
                        type="STRING",
                        enum=["low", "medium", "high", "urgent"],
                        description="Urgency level assessed from the conversation context",
                    ),
                },
                required=["caller_name", "message"],
            ),
        )

    async def execute(self, session_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input arguments and asynchronously persist the caller message."""
        try:
            validated = TakeMessageSchema(**args)
        except ValidationError as ve:
            return {
                "status": "error",
                "retryable": False,
                "message": f"Validation error: {ve.errors()[0]['msg']}",
            }

        result = self._repo.save_message(
            session_id=session_id,
            caller_name=validated.caller_name,
            message=validated.message,
            phone_number=validated.phone_number,
            urgency=validated.urgency,
        )

        return result
