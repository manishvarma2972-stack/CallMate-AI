"""Standardized application exceptions and global exception handlers.

Ensures all client-facing error payloads adhere to a consistent JSON envelope schema.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_ctx

logger = logging.getLogger("app.errors")


# HTTP 422 status code (RFC 9110: Unprocessable Content)
HTTP_422_CODE: int = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)


class AppException(Exception):
    """Base domain exception for CallMate AI application errors."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details


class NotFoundError(AppException):
    """Resource not found exception (HTTP 404)."""

    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details=details,
        )


class ValidationAppError(AppException):
    """Business rule or input validation error (HTTP 422)."""

    def __init__(self, message: str = "Validation failed", details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=HTTP_422_CODE,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class ServiceUnavailableError(AppException):
    """Downstream or internal dependency unavailable (HTTP 503)."""

    def __init__(self, message: str = "Service temporarily unavailable", details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            details=details,
        )


def build_error_envelope(
    code: str,
    message: str,
    details: Optional[Any] = None,
) -> Dict[str, Any]:
    """Construct consistent error response envelope."""
    req_id = request_id_ctx.get()
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": req_id,
        }
    }


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application domain exceptions."""
    logger.warning(
        "Application exception: code=%s message=%s path=%s",
        exc.error_code,
        exc.message,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_envelope(
            code=exc.error_code,
            message=exc.message,
            details=exc.details,
        ),
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard Starlette / FastAPI HTTP exceptions."""
    code_map = {
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
    }
    error_code = code_map.get(exc.status_code, "HTTP_ERROR")

    logger.warning(
        "HTTP exception: status=%d code=%s message=%s path=%s",
        exc.status_code,
        error_code,
        exc.detail,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_envelope(
            code=error_code,
            message=str(exc.detail),
            details=None,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle incoming request schema validation failures."""
    details = exc.errors()
    logger.warning("Request validation failed on path=%s: %s", request.url.path, details)
    return JSONResponse(
        status_code=HTTP_422_CODE,
        content=build_error_envelope(
            code="REQUEST_VALIDATION_ERROR",
            message="The submitted request body, query parameter, or headers failed validation.",
            details=details,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled internal exceptions to prevent information leakage."""
    logger.exception("Unhandled server exception processing path=%s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_envelope(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please contact support or try again later.",
            details=None,
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers with the FastAPI application instance."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
