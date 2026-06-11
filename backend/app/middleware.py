"""
Verita — cross-cutting middleware & handlers.

  • Global exception handler: unexpected errors become a clean, logged 500 JSON envelope
    (never a stack trace to the client).
  • Optional API-key auth: if VERITA_API_KEY is set, every /api/* request (except health/docs)
    must send a matching `X-API-Key`. Unset → open (demo-friendly).
  • Per-IP rate limiting: a lightweight in-memory sliding window. Tunable via env.

All opt-in via environment variables, so the local demo runs with zero configuration.
"""

from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("verita.mw")

# Only /api/* is gated at all; /api/health is the one /api path left open for probes.
_OPEN_PATHS = ("/api/health",)


def _cfg() -> tuple[str, int, int]:
    """Read config per request so it's runtime-tunable and testable via env."""
    return (
        os.getenv("VERITA_API_KEY", "").strip(),
        int(os.getenv("VERITA_RATE_LIMIT", "600")),
        int(os.getenv("VERITA_RATE_WINDOW", "60")),
    )


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, deque] = defaultdict(deque)

    def _rate_limited(self, ip: str, limit: int, window: int) -> bool:
        now = time.monotonic()
        q = self._hits[ip]
        while q and q[0] <= now - window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path.startswith("/api") and not any(path.startswith(p) for p in _OPEN_PATHS):
            api_key, limit, window = _cfg()
            client_ip = request.client.host if request.client else "unknown"
            if self._rate_limited(client_ip, limit, window):
                return JSONResponse(status_code=429, content={"error": "rate_limited", "detail": f"Max {limit} requests / {window}s. Slow down."})
            if api_key and request.headers.get("X-API-Key") != api_key:
                return JSONResponse(status_code=401, content={"error": "unauthorized", "detail": "Missing or invalid X-API-Key."})

        return await call_next(request)


def install(app: FastAPI) -> None:
    app.add_middleware(SecurityMiddleware)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # noqa: ANN001
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "internal_error", "detail": "An unexpected error occurred. The incident was logged."})
