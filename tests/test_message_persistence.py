"""Automated tests for collision-safe message persistence, atomic writes, and permissions."""

import logging
import os
from pathlib import Path
import stat
import time
import uuid
import pytest

from app.core.errors import InvalidSessionIdError
from app.repositories.message_repo import MessageRepository


@pytest.fixture
def temp_storage(tmp_path: Path) -> MessageRepository:
    """Provide an isolated MessageRepository backed by a temporary directory."""
    return MessageRepository(storage_dir=tmp_path)


def test_save_message_success_and_structure(temp_storage: MessageRepository) -> None:
    """Verify successful message persistence yields structured response with message_id."""
    session_id = str(uuid.uuid4())
    result = temp_storage.save_message(
        session_id=session_id,
        caller_name="Ramesh Kumar",
        phone_number="+919876543210",
        message="Please call back regarding the property registration documents.",
        urgency="high",
    )

    assert result["status"] == "recorded"
    assert result["retryable"] is False
    assert "message_id" in result
    assert "recorded_at" in result
    assert result["message"] == "Message recorded successfully."

    # Verify retrieved on disk
    stored = temp_storage.get_message(result["message_id"])
    assert stored is not None
    assert stored["caller_name"] == "Ramesh Kumar"
    assert stored["phone_number"] == "+919876543210"
    assert stored["urgency"] == "high"


def test_file_permissions_restricted(temp_storage: MessageRepository) -> None:
    """Verify that persisted message files are created with 0o600 (owner read/write only)."""
    session_id = str(uuid.uuid4())
    result = temp_storage.save_message(
        session_id=session_id,
        caller_name="Sita Devi",
        message="Urgent inquiry regarding appointment.",
    )

    msg_file = temp_storage._storage_dir / f"{result['message_id']}.json"
    assert msg_file.exists()

    file_stat = os.stat(msg_file)
    file_mode = stat.S_IMODE(file_stat.st_mode)
    # Check that owner has read/write (0o600) and group/others have 0
    assert file_mode == 0o600


def test_collision_safe_concurrent_writes(temp_storage: MessageRepository) -> None:
    """Verify that multiple messages stored within the same second never overwrite one another."""
    session_id = str(uuid.uuid4())
    message_ids = []

    # Store 10 messages in rapid succession
    for i in range(10):
        res = temp_storage.save_message(
            session_id=session_id,
            caller_name=f"Caller {i}",
            message=f"Message body number {i}",
        )
        assert res["status"] == "recorded"
        message_ids.append(res["message_id"])

    # All 10 message IDs must be unique
    assert len(set(message_ids)) == 10

    # All 10 distinct files must exist on disk
    for msg_id in message_ids:
        msg = temp_storage.get_message(msg_id)
        assert msg is not None


def test_invalid_session_id_path_traversal_rejection(temp_storage: MessageRepository) -> None:
    """Verify that non-UUIDv4 session IDs are rejected to prevent path traversal."""
    with pytest.raises(InvalidSessionIdError):
        temp_storage.save_message(
            session_id="../../etc/passwd",
            caller_name="Malicious Actor",
            message="Path injection attempt",
        )


def test_safe_logging_no_caller_pii(temp_storage: MessageRepository, caplog: pytest.LogCaptureFixture) -> None:
    """Verify that caller phone numbers and message content are NOT printed to application logs."""
    session_id = str(uuid.uuid4())
    caller_phone = "+919988776655"
    caller_name = "Confidential Contact"
    secret_text = "Private medical details discussed on call"

    with caplog.at_level(logging.INFO):
        temp_storage.save_message(
            session_id=session_id,
            caller_name=caller_name,
            phone_number=caller_phone,
            message=secret_text,
        )

    for record in caplog.records:
        assert caller_phone not in record.message
        assert caller_name not in record.message
        assert secret_text not in record.message


def test_list_and_delete_messages(temp_storage: MessageRepository) -> None:
    """Verify that messages can be listed in descending order and safely deleted."""
    session_id = str(uuid.uuid4())
    res1 = temp_storage.save_message(
        session_id=session_id,
        caller_name="Caller One",
        message="Message number 1",
    )
    time.sleep(0.01)
    res2 = temp_storage.save_message(
        session_id=session_id,
        caller_name="Caller Two",
        message="Message number 2",
    )

    messages = temp_storage.list_messages()
    assert len(messages) == 2
    # Verify descending sort order
    assert messages[0]["message_id"] == res2["message_id"]
    assert messages[1]["message_id"] == res1["message_id"]

    # Test safe deletion
    assert temp_storage.delete_message(res1["message_id"]) is True
    assert temp_storage.get_message(res1["message_id"]) is None
    assert len(temp_storage.list_messages()) == 1

    # Test invalid / non-existent deletion
    assert temp_storage.delete_message("msg_nonexistent00000000000000000000") is False
    assert temp_storage.delete_message("../../invalid") is False
