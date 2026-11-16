"""Automated tests for application lifecycle events and API documentation."""

from fastapi.testclient import TestClient

from app.core.config import Environment, Settings
from app.main import create_app


def test_application_lifespan_startup_and_shutdown() -> None:
    """Verify application boots up through lifespan context manager and shuts down cleanly."""
    settings = Settings(
        APP_NAME="CallMate Lifespan Test",
        ENVIRONMENT=Environment.TEST,
        LOG_LEVEL="DEBUG",
    )
    app = create_app(settings=settings)

    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["app_name"] == "CallMate Lifespan Test"
        assert data["status"] == "healthy"


def test_openapi_documentation_accessible() -> None:
    """Verify Swagger UI, ReDoc, and OpenAPI specification endpoints are served."""
    app = create_app()

    with TestClient(app) as client:
        # Swagger UI
        docs_resp = client.get("/docs")
        assert docs_resp.status_code == 200
        assert "swagger-ui" in docs_resp.text.lower()

        # ReDoc
        redoc_resp = client.get("/redoc")
        assert redoc_resp.status_code == 200
        assert "redoc" in redoc_resp.text.lower()

        # OpenAPI schema JSON
        schema_resp = client.get("/openapi.json")
        assert schema_resp.status_code == 200
        schema = schema_resp.json()
        assert schema["info"]["title"] == "CallMate AI"
        assert "/health" in schema["paths"]
        assert "/api/v1/health" in schema["paths"]
