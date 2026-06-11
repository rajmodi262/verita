"""
Verita — FastAPI application entry point.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .logging_config import configure_logging

# Phase 10 — Feedback: structured logs that a collector (ELK/Loki) can parse.
configure_logging()
logger = logging.getLogger("verita")

app = FastAPI(
    title="Verita API",
    description="Financial Crime & Compliance intelligence — auto-dashboards and real risk scoring.",
    version="0.1.0",
)

# Phase 9 — Monitoring: expose Prometheus metrics at /metrics (no-op if lib absent).
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    logger.info("Prometheus instrumentation enabled at /metrics")
except Exception as e:  # pragma: no cover - monitoring is optional in dev
    logger.warning("Prometheus instrumentation unavailable: %s", e)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security: global error handler, optional API-key auth, per-IP rate limiting (all env-gated).
from .middleware import install as install_middleware

install_middleware(app)

# Relational persistence (PostgreSQL via DATABASE_URL; SQLite fallback for zero-config dev).
@app.on_event("startup")
def _init_database() -> None:
    try:
        from .db import dialect, init_db

        init_db()
        app.state.db_ready = True
        logger.info("Audit database ready (dialect=%s)", dialect())
    except Exception as e:
        app.state.db_ready = False
        logger.warning("Audit database unavailable — history disabled: %s", e)


from .routers.dashboard import router as dashboard_router
from .routers.risk import router as risk_router
from .routers.nlp import router as nlp_router
from .routers.sql import router as sql_router
from .routers.history import router as history_router
from .routers.agent import router as agent_router

app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Auto-Dashboard Studio"])
app.include_router(risk_router, prefix="/api/risk", tags=["FCC Risk & Anomaly Engine"])
app.include_router(nlp_router, prefix="/api/nlp", tags=["NLP Insight"])
app.include_router(sql_router, prefix="/api/sql", tags=["SQL Playground"])
app.include_router(history_router, prefix="/api/history", tags=["Audit Trail"])
app.include_router(agent_router, prefix="/api/agent", tags=["Compliance Investigator"])


@app.get("/api/health")
def health():
    import os

    from .genai import provider as genai

    from .db import dialect

    return {
        "status": "healthy",
        "service": "verita",
        "version": app.version,
        "auth": "enabled" if os.getenv("VERITA_API_KEY", "").strip() else "open",
        "risk_model": "loaded" if getattr(app.state, "risk_engine", None) else "lazy",
        "genai": genai.mode(),
        "database": {"dialect": dialect(), "ready": bool(getattr(app.state, "db_ready", False))},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
