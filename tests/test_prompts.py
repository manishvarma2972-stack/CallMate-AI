"""Automated tests for multilingual AI caller assistant system prompt construction and owner identity binding."""

import pytest
from app.core.config import Settings
from app.engine.prompts import build_system_instruction


def test_system_instruction_with_manish_varma_owner() -> None:
    """Verify that setting RECEPTIONIST_OWNER_NAME to Manish Varma binds correctly in English and Telugu."""
    settings = Settings(
        RECEPTIONIST_OWNER_NAME="Manish Varma",
        RECEPTIONIST_NAME="CallMate",
    )
    instruction = build_system_instruction(settings)

    # 1. Verify English identity bindings
    assert "You are CallMate, a polite, professional, and helpful AI personal incoming call assistant for Manish Varma (Manish Varma AI Caller Assistant)." in instruction
    assert "Hello! I'm Manish Varma's AI caller assistant. How can I help you?" in instruction
    assert "NEVER pretend to be Manish Varma." in instruction
    assert "NEVER claim to be a human receptionist." in instruction
    assert "You must NEVER disclose Manish Varma's private schedule" in instruction
    assert "If Manish Varma is unavailable, offer to take a message" in instruction
    assert "confirm ONLY that the message has been recorded for Manish Varma." in instruction

    # 2. Verify Telugu identity bindings
    assert "Manish Varma గారి ఏఐ కాలర్ అసిస్టెంట్ ని" in instruction

    # 3. Verify no lingering references to prior owner identity
    assert "Phani" not in instruction


def test_system_instruction_dynamic_owner_override() -> None:
    """Verify that system prompt dynamically adapts to any configured owner name without hardcoding."""
    settings = Settings(
        RECEPTIONIST_OWNER_NAME="Custom Business Owner",
        RECEPTIONIST_NAME="CallMate",
    )
    instruction = build_system_instruction(settings)

    assert "Hello! I'm Custom Business Owner's AI caller assistant. How can I help you?" in instruction
    assert "Custom Business Owner గారి ఏఐ కాలర్ అసిస్టెంట్ ని" in instruction
    assert "Manish Varma" not in instruction
    assert "Phani Varma" not in instruction


def test_system_instruction_fallback_when_unset() -> None:
    """Verify graceful prompt construction when owner name is unset."""
    settings = Settings(
        RECEPTIONIST_OWNER_NAME=None,
        RECEPTIONIST_NAME="CallMate",
    )
    instruction = build_system_instruction(settings)

    assert "Hello! I'm the owner's AI caller assistant. How can I help you?" in instruction
    assert "the owner గారి ఏఐ కాలర్ అసిస్టెంట్ ని" in instruction
