"""Voice tools package for CallMate AI."""

from typing import Any, Dict, List, Optional
from google.genai import types

from app.engine.tools.base import BaseVoiceTool
from app.engine.tools.message_taker import TakeMessageTool


class ToolDispatcher:
    """Aggregates and dispatches tool calls during live Gemini voice sessions."""

    def __init__(self, tools: Optional[List[BaseVoiceTool]] = None) -> None:
        self._tools: Dict[str, BaseVoiceTool] = {}
        tool_list = tools if tools is not None else [TakeMessageTool()]
        for t in tool_list:
            self._tools[t.declaration.name] = t

    def get_declarations(self) -> List[types.Tool]:
        """Return the list of types.Tool wrapping all registered FunctionDeclarations."""
        decls = [t.declaration for t in self._tools.values()]
        return [types.Tool(function_declarations=decls)] if decls else []

    async def execute(self, session_id: str, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch execution to the registered tool by name."""
        tool = self._tools.get(name)
        if not tool:
            return {
                "status": "error",
                "retryable": False,
                "message": f"Tool '{name}' is not recognized or authorized.",
            }
        return await tool.execute(session_id=session_id, args=args)


__all__ = ["BaseVoiceTool", "TakeMessageTool", "ToolDispatcher"]
