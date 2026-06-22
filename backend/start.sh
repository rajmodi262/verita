#!/usr/bin/env bash
# Production start script for the Verita backend.
# Used by Render (or any Docker/Linux host).
#
# PORT is injected by Render; default to 8000 for local testing.
set -e

PORT="${PORT:-8000}"

exec gunicorn app.main:app \
  --workers 2 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
