"""Health diagnostics API endpoints."""

from fastapi import APIRouter, Depends, status

from app.schemas.health import SystemHealthResponse
from app.services.health import HealthService, get_health_service

router = APIRouter()


@router.get(
    "/health",
    response_model=SystemHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Diagnostics",
    description="Returns live system operational telemetry including process uptime, memory consumption, and runtime metrics.",
    tags=["Diagnostics"],
)
async def check_health(
    health_service: HealthService = Depends(get_health_service),
) -> SystemHealthResponse:
    """Retrieve real-time health diagnostics for the CallMate AI service."""
    return health_service.get_system_health()
