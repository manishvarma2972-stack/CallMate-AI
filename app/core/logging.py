"""Structured application logging configuration.

Supports contextual request ID propagation, ISO-8601 UTC timestamps,
and both structured JSON and human-readable console outputs.
"""

from contextvars import ContextVar
from datetime import datetime, timezone
import json
import logging
import sys
from typing import Any, Dict, Optional

# Context variable to hold request correlation ID across async execution flow
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class JSONFormatter(logging.Formatter):
    """Structured JSON formatter for production and cloud log aggregators."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
            "process_id": record.process,
        }

        # Include request ID if active in context
        req_id = request_id_ctx.get()
        if req_id:
            log_payload["request_id"] = req_id

        # Include exception trace if present
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        # Include custom extra fields if supplied
        extra_keys = set(record.__dict__.keys()) - {
            "name", "msg", "args", "levelname", "levelno", "pathname",
            "filename", "module", "exc_info", "exc_text", "stack_info",
            "lineno", "funcName", "created", "msecs", "relativeCreated",
            "thread", "threadName", "processName", "process", "message",
        }
        if extra_keys:
            log_payload["extra"] = {key: getattr(record, key) for key in extra_keys}

        return json.dumps(log_payload, default=str)


class ConsoleFormatter(logging.Formatter):
    """Human-readable formatter with timestamps and request correlation for local development."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        req_id = request_id_ctx.get()
        req_id_str = f" [{req_id}]" if req_id else ""
        base = f"{timestamp} | {record.levelname:<8} | {record.name}{req_id_str} | {record.getMessage()}"
        if record.exc_info:
            base += f"\n{self.formatException(record.exc_info)}"
        return base


def setup_logging(
    log_level: str = "INFO",
    log_format: str = "console",
) -> None:
    """Initialize root and application loggers with the designated formatter and level."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove pre-existing handlers to prevent duplicated logs
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    if log_format.lower() == "json":
        stream_handler.setFormatter(JSONFormatter())
    else:
        stream_handler.setFormatter(ConsoleFormatter())

    root_logger.addHandler(stream_handler)

    # Align third-party loggers
    logging.getLogger("uvicorn.error").setLevel(numeric_level)
    logging.getLogger("uvicorn.access").setLevel(numeric_level)
