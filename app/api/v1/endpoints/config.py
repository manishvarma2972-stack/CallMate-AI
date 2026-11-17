"""API endpoint exposing active CallMate AI assistant configuration and telecommunication status."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Request, status

from app.core.config import Settings, get_settings

router = APIRouter()


def get_active_settings(request: Request) -> Settings:
    """Resolve active application settings from app state or singleton."""
    return getattr(request.app.state, "settings", None) or get_settings()


@router.get(
    "/assistant/config",
    status_code=status.HTTP_200_OK,
    summary="Retrieve Active Assistant Configuration",
    description="Exposes current assistant persona, owner bindings, voice settings, and telecom integration status.",
    tags=["Assistant Configuration"],
)
def get_assistant_config(
    settings: Settings = Depends(get_active_settings),
) -> Dict[str, Any]:
    """Retrieve operational metadata for the CallMate UI."""
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT.value,
        "receptionist_name": settings.RECEPTIONIST_NAME,
        "owner_name": settings.RECEPTIONIST_OWNER_NAME or "Not Configured",
        "is_owner_configured": settings.is_owner_configured,
        "gemini_model": settings.GEMINI_MODEL,
        "gemini_voice_name": settings.GEMINI_VOICE_NAME,
        "gemini_temperature": settings.GEMINI_TEMPERATURE,
        "supported_languages": [
            {"code": "en", "name": "English", "native": "English"},
            {"code": "te", "name": "Telugu", "native": "తెలుగు"},
        ],
        "default_language": "bilingual_auto",
        "telecom_integration": {
            "status": "awaiting_carrier_trunking",
            "provider": "Virtual PBX / Local Gateway",
            "forwarding_enabled": False,
            "carrier_code_jio": "*401*",
            "carrier_code_airtel": "**21*",
            "carrier_code_us": "*72",
        },
    }
