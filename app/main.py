"""CallMate AI - Main Application Entrypoint.

Initializes FastAPI with structured logging, CORS, correlation tracing,
centralized exception handlers, and modular API routing.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.health import check_health
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestCorrelationMiddleware
from app.schemas.health import SystemHealthResponse
from app.services.health import HealthService

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
            "CallMate AI is a production-quality personal voice receptionist backend "
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

    return app


# Production application instance for ASGI servers (Uvicorn / Gunicorn)
app = create_app()
