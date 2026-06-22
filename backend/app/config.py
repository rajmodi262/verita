"""Verita — Configuration."""

from __future__ import annotations

import os

# Load a local .env (if present) BEFORE any os.getenv below runs, so keys like
# GROQ_API_KEY / GEMINI_API_KEY in backend/.env are picked up without exporting them
# by hand. .env is gitignored — secrets never get committed.
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
    load_dotenv()  # also honour a .env in the current working directory
except Exception:  # python-dotenv missing or unreadable .env — fall back to real env vars
    pass

# CORS origins for the Vite dev server.
CORS_ORIGINS = os.getenv(
    "VERITA_CORS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000",
).split(",")

# Dev convenience: allow ANY localhost / 127.0.0.1 port (Vite may pick 5176+,
# and the browser treats localhost and 127.0.0.1 as DIFFERENT origins). Without
# this, uploads silently fail with a CORS error the moment the dev port shifts.
# Override (e.g. tighten in production) with VERITA_CORS_REGEX.
CORS_ORIGIN_REGEX = os.getenv(
    "VERITA_CORS_REGEX",
    r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
)

# Upload guardrails.
MAX_UPLOAD_BYTES = int(os.getenv("VERITA_MAX_UPLOAD_MB", "25")) * 1024 * 1024
MAX_PROFILE_ROWS = int(os.getenv("VERITA_MAX_ROWS", "200000"))  # sample beyond this for speed
