"""Automated tests for health check endpoints and real diagnostic reporting."""

from fastapi.testclient import TestClient
import httpx
import pytest


def test_root_health_endpoint_success(client: TestClient) -> None:
    """Verify GET /health returns 200 with complete, real runtime diagnostics."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "CallMate AI Test"
    assert data["environment"] == "test"
    assert data["version"] == "0.1.0-test"

    # Verify real metrics are populated
    assert isinstance(data["uptime_seconds"], (int, float))
    assert data["uptime_seconds"] >= 0.0

    assert "python_version" in data
    assert isinstance(data["process_id"], int)
    assert data["process_id"] > 0

    assert "memory" in data
    assert isinstance(data["memory"]["rss_mb"], (int, float))
    assert data["memory"]["rss_mb"] >= 0.0
    assert isinstance(data["memory"]["rss_bytes"], int)
    assert data["memory"]["rss_bytes"] >= 0

    # Verify correlation and timing telemetry headers
    assert "x-request-id" in response.headers
    assert "x-response-time-ms" in response.headers


def test_versioned_health_endpoint_success(client: TestClient) -> None:
    """Verify GET /api/v1/health returns 200 with identical real diagnostics."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "CallMate AI Test"
    assert isinstance(data["uptime_seconds"], (int, float))


@pytest.mark.asyncio
async def test_async_health_endpoint(async_client: httpx.AsyncClient) -> None:
    """Verify health endpoint responds appropriately under async HTTP client execution."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
