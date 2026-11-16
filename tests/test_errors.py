"""Automated tests for standardized error handling and exception responses."""

from fastapi import FastAPI, Query
from fastapi.testclient import TestClient
import pytest

from app.core.errors import AppException, NotFoundError, ServiceUnavailableError, ValidationAppError
from app.main import create_app


@pytest.fixture
def error_app() -> FastAPI:
    """Create a FastAPI application with test endpoints designed to trigger errors."""
    test_app = create_app()

    @test_app.get("/test/custom-exception")
    def trigger_custom_exception() -> None:
        raise AppException(
            message="Domain violation",
            status_code=400,
            error_code="DOMAIN_RULE_VIOLATED",
            details={"field": "account_status", "issue": "inactive"},
        )

    @test_app.get("/test/not-found-exception")
    def trigger_not_found() -> None:
        raise NotFoundError(message="Call session not found")

    @test_app.get("/test/validation-exception")
    def trigger_validation_app_error() -> None:
        raise ValidationAppError(message="Phone format rejected")

    @test_app.get("/test/service-unavailable")
    def trigger_service_unavailable() -> None:
        raise ServiceUnavailableError(message="Voice streaming provider unreachable")

    @test_app.get("/test/unhandled-crash")
    def trigger_crash() -> None:
        raise RuntimeError("Uncaught low-level server crash")

    @test_app.get("/test/schema-validation")
    def trigger_schema_validation(limit: int = Query(..., ge=1, le=100)) -> dict:
        return {"limit": limit}

    return test_app


def test_404_not_found_standard_envelope(client: TestClient) -> None:
    """Verify non-existent endpoints yield a compliant error envelope."""
    response = client.get("/non-existent-endpoint-404")
    assert response.status_code == 404

    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "NOT_FOUND"
    assert "timestamp" in payload["error"]
    assert "x-request-id" in response.headers


def test_405_method_not_allowed_envelope(client: TestClient) -> None:
    """Verify unsupported HTTP verbs yield a compliant error envelope."""
    response = client.post("/health")
    assert response.status_code == 405

    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_custom_app_exception_handling(error_app: FastAPI) -> None:
    """Verify custom AppException generates the specified status code and error code."""
    with TestClient(error_app) as client:
        response = client.get("/test/custom-exception")
        assert response.status_code == 400

        payload = response.json()
        assert payload["error"]["code"] == "DOMAIN_RULE_VIOLATED"
        assert payload["error"]["message"] == "Domain violation"
        assert payload["error"]["details"] == {"field": "account_status", "issue": "inactive"}


def test_domain_subclass_exceptions(error_app: FastAPI) -> None:
    """Verify specific domain exception subclasses produce appropriate responses."""
    with TestClient(error_app) as client:
        # NotFoundError (404)
        resp_404 = client.get("/test/not-found-exception")
        assert resp_404.status_code == 404
        assert resp_404.json()["error"]["code"] == "NOT_FOUND"

        # ValidationAppError (422)
        resp_val = client.get("/test/validation-exception")
        assert resp_val.status_code == 422
        assert resp_val.json()["error"]["code"] == "VALIDATION_ERROR"

        # ServiceUnavailableError (503)
        resp_503 = client.get("/test/service-unavailable")
        assert resp_503.status_code == 503
        assert resp_503.json()["error"]["code"] == "SERVICE_UNAVAILABLE"


def test_request_validation_failure_envelope(error_app: FastAPI) -> None:
    """Verify schema validation errors return 422 with structured field details."""
    with TestClient(error_app) as client:
        response = client.get("/test/schema-validation?limit=invalid_number")
        assert response.status_code == 422

        payload = response.json()
        assert payload["error"]["code"] == "REQUEST_VALIDATION_ERROR"
        assert isinstance(payload["error"]["details"], list)


def test_unhandled_crash_returns_500_envelope(error_app: FastAPI) -> None:
    """Verify unexpected server exceptions return a sanitized 500 error envelope."""
    with TestClient(error_app, raise_server_exceptions=False) as client:
        response = client.get("/test/unhandled-crash")
        assert response.status_code == 500

        payload = response.json()
        assert payload["error"]["code"] == "INTERNAL_SERVER_ERROR"
        assert "server error occurred" in payload["error"]["message"].lower()
