"""Automated tests for configuration loading, overrides, and environment variable validation."""

import pytest
from pydantic import ValidationError

from app.core.config import Environment, Settings


def test_default_settings_instantiation() -> None:
    """Verify default configuration attributes are appropriately populated."""
    settings = Settings()
    assert settings.APP_NAME == "CallMate AI"
    assert settings.PORT == 8000
    assert settings.ENVIRONMENT == Environment.DEVELOPMENT
    assert settings.LOG_LEVEL == "INFO"
    assert settings.LOG_FORMAT == "console"
    assert not settings.is_production
    assert not settings.is_testing


def test_custom_settings_override() -> None:
    """Verify settings can be overridden with valid inputs."""
    settings = Settings(
        APP_NAME="Custom Receptionist",
        ENVIRONMENT=Environment.PRODUCTION,
        PORT=9090,
        DEBUG=True,
        LOG_LEVEL="DEBUG",
        LOG_FORMAT="json",
    )
    assert settings.APP_NAME == "Custom Receptionist"
    assert settings.ENVIRONMENT == Environment.PRODUCTION
    assert settings.PORT == 9090
    assert settings.is_production is True
    assert settings.LOG_FORMAT == "json"


def test_invalid_port_validation_failure() -> None:
    """Verify invalid network ports trigger validation errors."""
    with pytest.raises(ValidationError):
        Settings(PORT=0)

    with pytest.raises(ValidationError):
        Settings(PORT=70000)


def test_invalid_environment_validation_failure() -> None:
    """Verify unknown environments trigger validation errors."""
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="invalid-env")  # type: ignore[arg-type]


def test_cors_origins_and_hosts_parsing() -> None:
    """Verify CSV and JSON array strings are properly parsed into string lists."""
    csv_settings = Settings(
        CORS_ORIGINS="http://localhost:3000, https://app.callmate.ai",  # type: ignore[arg-type]
        ALLOWED_HOSTS="localhost, 127.0.0.1",  # type: ignore[arg-type]
    )
    assert csv_settings.CORS_ORIGINS == ["http://localhost:3000", "https://app.callmate.ai"]
    assert csv_settings.ALLOWED_HOSTS == ["localhost", "127.0.0.1"]

    json_settings = Settings(
        CORS_ORIGINS='["http://example.com", "http://callmate.ai"]',  # type: ignore[arg-type]
    )
    assert json_settings.CORS_ORIGINS == ["http://example.com", "http://callmate.ai"]
