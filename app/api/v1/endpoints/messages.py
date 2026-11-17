"""API endpoints for retrieving and managing persisted caller messages."""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.repositories.message_repo import MessageRepository, get_message_repository

logger = logging.getLogger("app.api.v1.endpoints.messages")
router = APIRouter()


@router.get(
    "/messages",
    status_code=status.HTTP_200_OK,
    summary="List Persisted Caller Messages",
    description="Returns real caller messages recorded by the AI caller assistant during live voice calls.",
    tags=["Messages"],
)
def list_caller_messages(
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of messages to return"),
    repo: MessageRepository = Depends(get_message_repository),
) -> Dict[str, Any]:
    """Retrieve list of caller messages ordered by recorded timestamp descending."""
    messages = repo.list_messages(limit=limit)
    return {
        "messages": messages,
        "total": len(messages),
    }


@router.delete(
    "/messages/{message_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Persisted Caller Message",
    description="Safely removes a caller message from disk storage.",
    tags=["Messages"],
)
def delete_caller_message(
    message_id: str,
    repo: MessageRepository = Depends(get_message_repository),
) -> Dict[str, Any]:
    """Remove a message by its unique message ID."""
    success = repo.delete_message(message_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message {message_id} not found or could not be deleted.",
        )
    return {
        "status": "deleted",
        "message_id": message_id,
    }
