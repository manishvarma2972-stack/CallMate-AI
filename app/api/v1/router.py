"""Central router aggregating all Version 1 API endpoint modules."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, config, health, messages, voice

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router, tags=["Diagnostics"])
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(voice.router, tags=["Voice Streaming"])
api_router.include_router(messages.router, tags=["Messages"])
api_router.include_router(config.router, tags=["Assistant Configuration"])
