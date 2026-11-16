"""Base abstractions for Gemini function tools."""

from abc import ABC, abstractmethod
from typing import Any, Dict
from google.genai import types


class BaseVoiceTool(ABC):
    """Abstract base class for voice tools executable during a Gemini Live session."""

    @property
    @abstractmethod
    def declaration(self) -> types.FunctionDeclaration:
        """Return the typed Gemini FunctionDeclaration."""
        pass

    @abstractmethod
    async def execute(self, session_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the function logic asynchronously and return structured response."""
        pass
