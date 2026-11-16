"""Application configuration using Pydantic Settings.

Provides type-safe environment variable parsing, validation, and defaults.
"""

from enum import Enum
from functools import lru_cache
import json
from typing import Any, List, Literal, Optional
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Supported application runtime environments."""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TEST = "test"


class Settings(BaseSettings):
    """Application settings resolved from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Information
    APP_NAME: str = Field(default="CallMate AI", description="Human-readable application name")
    APP_VERSION: str = Field(default="0.2.0", description="Semantic application version")
    ENVIRONMENT: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Target deployment environment",
    )
    DEBUG: bool = Field(default=False, description="Debug mode toggle")

    # Server Networking
    HOST: str = Field(default="0.0.0.0", description="Server bind host")
    PORT: int = Field(default=8000, ge=1, le=65535, description="Server listen port (1-65535)")
    API_V1_PREFIX: str = Field(default="/api/v1", description="URL prefix for version 1 API endpoints")

    # Logging Configuration
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Logging severity threshold",
    )
    LOG_FORMAT: Literal["console", "json"] = Field(
        default="console",
        description="Logging output format (console for local dev, json for structured cloud)",
    )

    # Security & Owner Settings (Phase 2)
    SECRET_KEY: SecretStr = Field(
        default=SecretStr("dev-insecure-secret-key-32-bytes-minimum-length!"),
        description="Cryptographic key for signing session tokens",
    )
    OWNER_API_KEY: SecretStr = Field(
        default=SecretStr("dev-owner-secret-key"),
        description="Owner API key required to create voice sessions",
    )
    RECEPTIONIST_OWNER_NAME: Optional[str] = Field(
        default=None,
        description="Owner display name (Must be configured before voice sessions can be created)",
    )
    RECEPTIONIST_NAME: str = Field(
        default="CallMate",
        description="Display name of the AI receptionist",
    )

    # Gemini Live Voice Engine Settings (Phase 2)
    GEMINI_API_KEY: SecretStr = Field(
        default=SecretStr(""),
        description="Google Gemini Live API Key",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.8-live",
        description="Verified Gemini Live model identifier",
    )
    GEMINI_API_VERSION: str = Field(
        default="v1alpha",
        description="API version required for Gemini Live bidirectional WebSocket streaming (v1alpha)",
    )
    GEMINI_VOICE_NAME: str = Field(
        default="Aoede",
        description="Prebuilt voice persona (Aoede, Kore, Puck, Charon, Fenrir)",
    )
    GEMINI_TEMPERATURE: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Model generation temperature",
    )

    # Voice Session & Storage Limits (Phase 2 Development In-Memory)
    MAX_ACTIVE_VOICE_SESSIONS: int = Field(
        default=25,
        ge=1,
        le=100,
        description="Maximum concurrent voice sessions permitted",
    )
    SESSION_TOKEN_TTL_SECONDS: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Validity duration of generated session tokens in seconds",
    )
    SESSION_RATE_LIMIT_PER_MINUTE: int = Field(
        default=10,
        ge=1,
        le=1000,
        description="Maximum session creation requests per client per minute",
    )
    MESSAGE_STORAGE_PATH: str = Field(
        default="data/messages",
        description="Local directory for development JSON message storage",
    )

    # Security & CORS
    ALLOWED_HOSTS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP Host header values",
    )
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed Cross-Origin Resource Sharing (CORS) origins",
    )

    @field_validator("PORT")
    @classmethod
    def validate_port_range(cls, value: int) -> int:
        """Validate network port is within valid TCP range."""
        if not (1 <= value <= 65535):
            raise ValueError(f"PORT must be between 1 and 65535, received: {value}")
        return value

    @field_validator("ALLOWED_HOSTS", "CORS_ORIGINS", mode="before")
    @classmethod
    def parse_string_or_list(cls, value: Any) -> List[str]:
        """Support both JSON array strings and comma-separated lists from env vars."""
        if isinstance(value, str):
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed]
                except (json.JSONDecodeError, ValueError):
                    pass
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value]
        return value

    @property
    def is_production(self) -> bool:
        """Check if current environment is production."""
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_testing(self) -> bool:
        """Check if current environment is test."""
        return self.ENVIRONMENT == Environment.TEST

    @property
    def is_owner_configured(self) -> bool:
        """Check whether an owner display name has been explicitly provided."""
        return bool(self.RECEPTIONIST_OWNER_NAME and self.RECEPTIONIST_OWNER_NAME.strip())


@lru_cache
def get_settings() -> Settings:
    """Singleton getter for application settings with LRU cache."""
    return Settings()
