"""Pytest configuration and shared test fixtures."""

from typing import AsyncGenerator, Generator
from fastapi import FastAPI
from fastapi.testclient import TestClient
import httpx
import pytest

from app.core.config import Environment, Settings
from app.main import create_app


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Provide isolated test environment settings."""
    return Settings(
        APP_NAME="CallMate AI Test",
        APP_VERSION="0.1.0-test",
        ENVIRONMENT=Environment.TEST,
        DEBUG=True,
        PORT=8000,
        LOG_LEVEL="DEBUG",
        LOG_FORMAT="console",
    )


@pytest.fixture
def app(test_settings: Settings) -> FastAPI:
    """Create a fresh FastAPI test application instance."""
    return create_app(settings=test_settings)


@pytest.fixture
def client(app: FastAPI) -> Generator[TestClient, None, None]:
    """Synchronous test client powered by HTTPX."""
    with TestClient(app=app, base_url="http://testserver") as test_client:
        yield test_client


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[httpx.AsyncClient, None]:
    """Asynchronous test client powered by HTTPX."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
