"""Central router aggregating all Version 1 API endpoint modules."""

from fastapi import APIRouter

from app.api.v1.endpoints import health, voice

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router, tags=["Diagnostics"])
api_router.include_router(voice.router, tags=["Voice Streaming"])
