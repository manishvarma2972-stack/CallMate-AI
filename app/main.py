"""CallMate AI - Main Application Entrypoint.

Initializes FastAPI with structured logging, CORS, correlation tracing,
centralized exception handlers, and modular API routing.
"""

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints.health import check_health
from app.api.v1.router import api_router
from app.core.config import Environment, Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestCorrelationMiddleware
from app.schemas.health import SystemHealthResponse
from app.services.health import HealthService
from app.services.session import VoiceSessionManager

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle events."""
    settings = app.state.settings
    setup_logging(
        log_level=settings.LOG_LEVEL,
        log_format=settings.LOG_FORMAT,
    )
    HealthService.mark_startup()

    logger.info(
        "CallMate AI service initialized successfully: environment=%s version=%s",
        settings.ENVIRONMENT.value,
        settings.APP_VERSION,
    )
    yield
    logger.info("CallMate AI service shutdown completed.")


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    """Application factory for CallMate AI FastAPI service."""
    active_settings = settings or get_settings()

    app = FastAPI(
        title=active_settings.APP_NAME,
        version=active_settings.APP_VERSION,
        description=(
            "CallMate AI is a production-quality personal AI caller assistant backend "
            "designed to handle incoming phone calls, forward inquiries, and interact "
            "with callers naturally in English and Telugu using real-time voice AI."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Attach settings to application state
    app.state.settings = active_settings

    # Register Middlewares
    app.add_middleware(RequestCorrelationMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Global Exception Handlers
    register_exception_handlers(app)

    # Mount Direct Root Diagnostics Endpoint (/health)
    app.add_api_route(
        "/health",
        endpoint=check_health,
        methods=["GET"],
        response_model=SystemHealthResponse,
        status_code=status.HTTP_200_OK,
        summary="Root Health Diagnostics",
        description="Direct root-level health probe for container orchestrators and load balancers.",
        tags=["Diagnostics"],
    )

    # Mount Versioned API Routes (/api/v1)
    app.include_router(api_router, prefix=active_settings.API_V1_PREFIX)

    # Mount Web Client Static Assets & Direct Web Routes
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

        @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
        async def serve_index(request: Request) -> Response:
            index_path = static_dir / "index.html"
            if not index_path.exists():
                return Response(status_code=status.HTTP_404_NOT_FOUND)
            response = FileResponse(str(index_path))
            # In DEVELOPMENT and TEST modes on loopback only, auto-provision session cookie for developer convenience
            active_settings: Settings = request.app.state.settings
            client_host = request.client.host if request.client else ""
            if (
                active_settings.ENVIRONMENT in (Environment.DEVELOPMENT, Environment.TEST)
                and client_host in ("127.0.0.1", "::1", "localhost", "testclient")
            ):
                if not hasattr(request.app.state, "session_manager"):
                    request.app.state.session_manager = VoiceSessionManager(settings=active_settings)
                session_mgr: VoiceSessionManager = request.app.state.session_manager
                existing_cookie = request.cookies.get("callmate_owner_session")
                if not existing_cookie or not session_mgr.verify_owner_session_token(existing_cookie):
                    owner_token = session_mgr.create_owner_session_token()
                    response.set_cookie(
                        key="callmate_owner_session",
                        value=owner_token,
                        httponly=True,
                        secure=active_settings.is_production,
                        samesite="lax",
                        max_age=86400,
                        path="/",
                    )
            return response

    # Development Verification Console (/dev/audio-test)
    scripts_test_html = Path(__file__).parent.parent / "scripts" / "test_audio_browser.html"
    if scripts_test_html.exists():
        @app.api_route("/dev/audio-test", methods=["GET", "HEAD"], include_in_schema=False)
        async def serve_dev_test(request: Request) -> Response:
            response = FileResponse(str(scripts_test_html))
            active_settings: Settings = request.app.state.settings
            client_host = request.client.host if request.client else ""
            if (
                active_settings.ENVIRONMENT in (Environment.DEVELOPMENT, Environment.TEST)
                and client_host in ("127.0.0.1", "::1", "localhost", "testclient")
            ):
                if not hasattr(request.app.state, "session_manager"):
                    request.app.state.session_manager = VoiceSessionManager(settings=active_settings)
                session_mgr: VoiceSessionManager = request.app.state.session_manager
                existing_cookie = request.cookies.get("callmate_owner_session")
                if not existing_cookie or not session_mgr.verify_owner_session_token(existing_cookie):
                    owner_token = session_mgr.create_owner_session_token()
                    response.set_cookie(
                        key="callmate_owner_session",
                        value=owner_token,
                        httponly=True,
                        secure=active_settings.is_production,
                        samesite="lax",
                        max_age=86400,
                        path="/",
                    )
            return response

    return app


# Production application instance for ASGI servers (Uvicorn / Gunicorn)
app = create_app()
