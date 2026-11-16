"""HTTP middlewares for request tracking, correlation ID injection, and execution timing."""

import logging
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import request_id_ctx

logger = logging.getLogger("app.middleware")


class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    """Injects and propagates unique request IDs and logs HTTP transaction telemetry."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract or generate correlation ID
        correlation_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(correlation_id)

        start_time = time.perf_counter()
        logger.info(
            "HTTP request started: method=%s path=%s client=%s",
            request.method,
            request.url.path,
            request.client.host if request.client else "unknown",
        )

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            # Attach telemetry headers
            response.headers["X-Request-ID"] = correlation_id
            response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

            logger.info(
                "HTTP request completed: method=%s path=%s status=%d duration=%.2fms",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.error(
                "HTTP request failed: method=%s path=%s duration=%.2fms",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        finally:
            request_id_ctx.reset(token)
