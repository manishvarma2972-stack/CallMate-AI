"""Data access and persistence repositories."""

from app.repositories.message_repo import MessageRepository, get_message_repository

__all__ = ["MessageRepository", "get_message_repository"]
