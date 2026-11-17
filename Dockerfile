# syntax=docker/dockerfile:1
# CallMate AI - Production Docker Container
# Base Image: Python 3.12 Slim (LTS, hardened, battle-tested production standard)
FROM python:3.12-slim

# Sensible Python production defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install minimal security/operational utilities (curl for container debugging)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root system group and user for security compliance
RUN groupadd --gid 10001 appgroup && \
    useradd --uid 10001 --gid appgroup --shell /bin/false --no-create-home appuser

# Install dependencies in a separate layer to leverage Docker build cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app ./app

# Create persistent storage directory for development message persistence
RUN mkdir -p /app/data/messages && \
    chown -R appuser:appgroup /app

# Volume mount point for persistent message storage
VOLUME ["/app/data/messages"]

# Switch to non-root application user
USER appuser

# Expose HTTP port
EXPOSE 8000

# Container healthcheck using standard library urllib and dynamic port resolution
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request, os; port=os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health')" || exit 1

# Production application entrypoint (supports dynamic $PORT injection by Render/Cloud platforms)
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
