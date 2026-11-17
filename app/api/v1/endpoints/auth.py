"""Owner authentication and session management endpoints.

Provides secure HttpOnly cookie session management for browser clients,
with convenient loopback auto-initialization for local development and
explicit API key authentication for production deployments.
"""

import hmac
from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, Field

from app.core.config import Environment, Settings, get_settings
from app.core.errors import VoiceAuthenticationError
from app.services.session import VoiceSessionManager, get_session_manager

router = APIRouter()


def get_active_settings(request: Request) -> Settings:
    """Resolve active application settings from app state or singleton."""
    return getattr(request.app.state, "settings", None) or get_settings()


def get_active_session_manager(request: Request) -> VoiceSessionManager:
    """Resolve active VoiceSessionManager bound to application state."""
    if not hasattr(request.app.state, "session_manager"):
        settings = get_active_settings(request)
        request.app.state.session_manager = VoiceSessionManager(settings=settings)
    return request.app.state.session_manager


class LoginRequest(BaseModel):
    api_key: str = Field(..., description="Owner API key")


class SessionStatusResponse(BaseModel):
    authenticated: bool
    owner_name: Optional[str] = None
    environment: str
    auth_method: str


@router.get(
    "/auth/session",
    response_model=SessionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check or Initialize Owner Web Session",
    tags=["Authentication"],
)
def get_auth_session(
    req: Request,
    res: Response,
    settings: Settings = Depends(get_active_settings),
    session_manager: VoiceSessionManager = Depends(get_active_session_manager),
) -> SessionStatusResponse:
    """Check active session cookie or provision development session on localhost."""
    cookie_token = req.cookies.get("callmate_owner_session")
    if cookie_token and session_manager.verify_owner_session_token(cookie_token):
        return SessionStatusResponse(
            authenticated=True,
            owner_name=settings.RECEPTIONIST_OWNER_NAME,
            environment=settings.ENVIRONMENT.value,
            auth_method="session_cookie",
        )

    # In local development mode on loopback, issue owner session cookie automatically
    client_host = req.client.host if req.client else ""
    if settings.ENVIRONMENT == Environment.DEVELOPMENT and client_host in ("127.0.0.1", "::1", "localhost", "testclient"):
        token = session_manager.create_owner_session_token()
        res.set_cookie(
            key="callmate_owner_session",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=86400,
            path="/",
        )
        return SessionStatusResponse(
            authenticated=True,
            owner_name=settings.RECEPTIONIST_OWNER_NAME,
            environment=settings.ENVIRONMENT.value,
            auth_method="development_loopback",
        )

    return SessionStatusResponse(
        authenticated=False,
        owner_name=None,
        environment=settings.ENVIRONMENT.value,
        auth_method="unauthenticated",
    )


@router.post(
    "/auth/session",
    response_model=SessionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate Owner with API Key",
    tags=["Authentication"],
)
def login_auth_session(
    login_data: LoginRequest,
    req: Request,
    res: Response,
    settings: Settings = Depends(get_active_settings),
    session_manager: VoiceSessionManager = Depends(get_active_session_manager),
) -> SessionStatusResponse:
    """Validate owner API key and set authenticated HttpOnly session cookie."""
    if not hmac.compare_digest(login_data.api_key, settings.OWNER_API_KEY.get_secret_value()):
        raise VoiceAuthenticationError("Invalid owner API key")

    token = session_manager.create_owner_session_token()
    res.set_cookie(
        key="callmate_owner_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
        path="/",
    )
    return SessionStatusResponse(
        authenticated=True,
        owner_name=settings.RECEPTIONIST_OWNER_NAME,
        environment=settings.ENVIRONMENT.value,
        auth_method="api_key_login",
    )


@router.delete(
    "/auth/session",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear Owner Web Session",
    tags=["Authentication"],
)
def logout_auth_session(res: Response) -> None:
    """Clear owner session cookie."""
    res.delete_cookie(key="callmate_owner_session", path="/")
