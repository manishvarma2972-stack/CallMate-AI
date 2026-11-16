# CallMate AI — Personal Voice Receptionist (Phase 1: Backend Foundation)

CallMate AI is an AI-powered personal voice receptionist designed to receive incoming phone calls, forward inquiries, and interact naturally with callers in English and Telugu using real-time voice streaming AI.

This repository represents **Phase 1: Backend Foundation**, establishing a production-grade, modular, and containerized FastAPI foundation with structured logging, configuration validation, real-time health telemetry, standardized error handling, and automated testing.

---

## Final Directory Structure

```text
CallMate-AI/
├── .dockerignore              # Exclusions for Docker build context
├── .env.example               # Template with all documented configuration keys
├── .gitignore                 # Standard Python, IDE, OS, and environment ignores
├── Dockerfile                 # Multi-stage/hardened Python 3.12-slim production image
├── README.md                  # System architecture, commands, and operational documentation
├── pyproject.toml             # Modern Python project configuration & pytest settings
├── requirements.txt           # Production dependencies with version bounds
├── requirements-dev.txt       # Development & testing dependencies
├── app/                       # Core application package
│   ├── __init__.py            # Package root & semantic version
│   ├── main.py                # FastAPI initialization, lifespan management, & route mounting
│   ├── api/                   # API routing layer
│   │   ├── __init__.py
│   │   └── v1/                # Version 1 API namespace
│   │       ├── __init__.py
│   │       ├── router.py      # Aggregates V1 modular endpoints
│   │       └── endpoints/     # Endpoint controllers
│   │           ├── __init__.py
│   │           └── health.py  # Health diagnostics route controller
│   ├── core/                  # Cross-cutting system infrastructure
│   │   ├── __init__.py
│   │   ├── config.py          # Pydantic Settings environment configuration
│   │   ├── errors.py          # Custom domain exceptions & standardized error handlers
│   │   ├── logging.py         # Structured JSON & console loggers with request correlation
│   │   └── middleware.py      # Request correlation ID & latency telemetry middleware
│   ├── schemas/               # Pydantic request/response validation schemas
│   │   ├── __init__.py
│   │   ├── common.py          # Shared schemas (e.g., ErrorResponse envelope)
│   │   └── health.py          # Health check & memory metrics payload models
│   └── services/              # Domain services
│       ├── __init__.py
│       └── health.py          # Real-time process telemetry & diagnostics service
└── tests/                     # Automated test suite
    ├── __init__.py
    ├── conftest.py            # Pytest fixtures & HTTPX test client setup
    ├── test_config.py         # Configuration loading, override, and validation tests
    ├── test_errors.py         # Standardized error envelope & exception handling tests
    ├── test_health.py         # Real health endpoint metrics & async client tests
    └── test_lifecycle.py      # Lifespan startup/shutdown & OpenAPI docs tests
```

---

## File Purposes

| File / Directory | Purpose |
| :--- | :--- |
| `app/main.py` | Application entrypoint. Configures FastAPI, lifespan hooks, CORS, request correlation, global error handlers, and route mounting. |
| `app/core/config.py` | Centralized configuration using `pydantic-settings`. Validates port ranges, environments, log levels, and CORS origins. |
| `app/core/logging.py` | Configures structured logging. Generates JSON logs in production and clean console logs in development. Injects request correlation IDs. |
| `app/core/errors.py` | Defines base domain exceptions (`AppException`, `NotFoundError`, `ValidationAppError`) and registers FastAPI exception handlers for standardized JSON error envelopes. |
| `app/core/middleware.py` | Intercepts requests, assigns/propagates `X-Request-ID`, calculates latency (`X-Response-Time-Ms`), and sets context variables. |
| `app/schemas/health.py` | Pydantic model enforcing the schema of the health diagnostics response. |
| `app/schemas/common.py` | Reusable error response schemas for OpenAPI documentation. |
| `app/services/health.py` | Samples real operating system metrics (resident memory RSS via `resource`, continuous uptime via `time.monotonic`, PID, Python version). |
| `app/api/v1/router.py` | Aggregates all versioned endpoints under `/api/v1`. |
| `app/api/v1/endpoints/health.py` | Controller serving health diagnostics. |
| `Dockerfile` | Builds a hardened, non-root (`appuser`, UID 10001) production container based on `python:3.12-slim`. |
| `pyproject.toml` | Project configuration specifying metadata, package dependencies, and `pytest` execution options. |

---

## Python Version Compatibility Analysis

- **Host Environment**: macOS Darwin arm64 with Python 3.14.6 (`/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`).
- **Local Testing**: Python 3.14.6 was tested with FastAPI, Pydantic, Pydantic-Settings, Uvicorn, HTTPX, and Pytest. All packages and pre-compiled wheels installed and passed 100% of test cases.
- **Production & Containerization Recommendation**: `python:3.12-slim` is selected for the Docker container and production cloud deployments. While Python 3.14 works for baseline web frameworks, subsequent phases of CallMate AI will incorporate telephony drivers, WebRTC, and real-time audio codecs where binary wheel stability across Linux architectures is most mature on Python 3.11 and 3.12.

---

## Dependency Versions

```text
fastapi>=0.115.0,<1.0.0          # High-performance async ASGI web framework
pydantic>=2.9.0,<3.0.0            # Data validation using Python type hints
pydantic-settings>=2.5.0,<3.0.0   # Environment variable parsing and validation
uvicorn[standard]>=0.30.0,<1.0.0  # Production ASGI server implementation
python-dotenv>=1.0.0,<2.0.0       # .env file support
pytest>=8.0.0,<10.0.0             # Automated testing framework
pytest-asyncio>=0.24.0,<2.0.0     # Async test execution support for pytest
httpx>=0.27.0,<1.0.0              # Async HTTP client for integration and route tests
```

---

## Running the Application

### 1. Local Environment Setup

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

Create a local environment configuration:

```bash
cp .env.example .env
```

### 2. Start Application Locally

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

### 3. Run Automated Tests

Execute the complete test suite:

```bash
pytest -v
```

### 4. Run via Docker

Build the Docker image:

```bash
docker build -t callmate-ai:latest .
```

Run the container:

```bash
docker run -d --name callmate-backend -p 8000:8000 callmate-ai:latest
```

Verify container status and logs:

```bash
docker ps
docker logs callmate-backend
```

Stop and remove container:

```bash
docker stop callmate-backend && docker rm callmate-backend
```

---

## Health Check Diagnostics

The application provides a live diagnostic health check endpoint at both `/health` and `/api/v1/health`. It queries real process and OS runtime telemetry (not hardcoded mock values):

```bash
curl -i http://localhost:8000/health
```

Sample Real Output:

```json
{
  "status": "healthy",
  "app_name": "CallMate AI",
  "environment": "development",
  "version": "0.1.0",
  "uptime_seconds": 45.12,
  "timestamp": "2026-11-16T07:25:31.102341Z",
  "python_version": "3.12.0",
  "process_id": 1,
  "memory": {
    "rss_mb": 42.15,
    "rss_bytes": 44199936
  }
}
```

Response Headers Include:
- `X-Request-ID`: Correlation identifier assigned to each HTTP transaction.
- `X-Response-Time-Ms`: High-resolution request execution duration in milliseconds.
