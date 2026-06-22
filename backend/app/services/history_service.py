"""Audit history service."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, select

from .exceptions import AuditTrailUnavailable

logger = logging.getLogger("verita.services.history")


def recent_analyses(limit: int) -> list[dict[str, Any]]:
    try:
        from ..db import SessionLocal
        from ..models_db import AnalysisRun

        with SessionLocal() as session:
            rows = session.scalars(
                select(AnalysisRun).order_by(AnalysisRun.created_at.desc()).limit(limit)
            ).all()
        return [r.as_dict() for r in rows]
    except Exception as exc:  # noqa: BLE001 - normalize persistence failures
        logger.exception("analysis history read failed")
        raise AuditTrailUnavailable(f"Audit database unavailable: {exc}") from exc


def recent_queries(limit: int) -> list[dict[str, Any]]:
    try:
        from ..db import SessionLocal
        from ..models_db import QueryLog

        with SessionLocal() as session:
            rows = session.scalars(
                select(QueryLog).order_by(QueryLog.created_at.desc()).limit(limit)
            ).all()
        return [r.as_dict() for r in rows]
    except Exception as exc:  # noqa: BLE001 - normalize persistence failures
        logger.exception("query history read failed")
        raise AuditTrailUnavailable(f"Audit database unavailable: {exc}") from exc


def recent_investigations(limit: int) -> list[dict[str, Any]]:
    try:
        from ..db import SessionLocal
        from ..models_db import Investigation

        with SessionLocal() as session:
            rows = session.scalars(
                select(Investigation).order_by(Investigation.created_at.desc()).limit(limit)
            ).all()
        return [r.as_dict() for r in rows]
    except Exception as exc:  # noqa: BLE001 - normalize persistence failures
        logger.exception("investigation history read failed")
        raise AuditTrailUnavailable(f"Audit database unavailable: {exc}") from exc


def summary_counts() -> dict[str, int]:
    """Return best-effort Overview counts; zero if the audit DB is unavailable."""
    try:
        from ..db import SessionLocal
        from ..models_db import AnalysisRun, Investigation, QueryLog

        with SessionLocal() as session:
            return {
                "analyses": session.scalar(select(func.count(AnalysisRun.id))) or 0,
                "investigations": session.scalar(select(func.count(Investigation.id))) or 0,
                "queries": session.scalar(select(func.count(QueryLog.id))) or 0,
            }
    except Exception:
        return {"analyses": 0, "investigations": 0, "queries": 0}
