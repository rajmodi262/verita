"""Verita — Configuration."""

from __future__ import annotations

import os

# CORS origins for the Vite dev server.
CORS_ORIGINS = os.getenv(
    "VERITA_CORS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000",
).split(",")

# Upload guardrails.
MAX_UPLOAD_BYTES = int(os.getenv("VERITA_MAX_UPLOAD_MB", "25")) * 1024 * 1024
MAX_PROFILE_ROWS = int(os.getenv("VERITA_MAX_ROWS", "200000"))  # sample beyond this for speed
