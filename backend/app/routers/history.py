"""
History Router — the persisted audit trail (PostgreSQL / SQLite via SQLAlchemy).

GET /api/history/analyses?limit=   → recent dataset analyses
GET /api/history/queries?limit=    → recent SQL queries (compliance audit log)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

logger = logging.getLogger("verita.history")
router = APIRouter()


@router.get("/analyses")
def recent_analyses(limit: int = Query(20, ge=1, le=100)):
    try:
        from ..db import SessionLocal
        from ..models_db import AnalysisRun

        with SessionLocal() as session:
            rows = session.scalars(
                select(AnalysisRun).order_by(AnalysisRun.created_at.desc()).limit(limit)
            ).all()
        return {"analyses": [r.as_dict() for r in rows]}
    except Exception as e:
        logger.exception("history read failed")
        raise HTTPException(status_code=503, detail=f"Audit database unavailable: {e}")


@router.get("/queries")
def recent_queries(limit: int = Query(20, ge=1, le=100)):
    try:
        from ..db import SessionLocal
        from ..models_db import QueryLog

        with SessionLocal() as session:
            rows = session.scalars(
                select(QueryLog).order_by(QueryLog.created_at.desc()).limit(limit)
            ).all()
        return {"queries": [r.as_dict() for r in rows]}
    except Exception as e:
        logger.exception("history read failed")
        raise HTTPException(status_code=503, detail=f"Audit database unavailable: {e}")


@router.get("/investigations")
def recent_investigations(limit: int = Query(20, ge=1, le=100)):
    try:
        from ..db import SessionLocal
        from ..models_db import Investigation

        with SessionLocal() as session:
            rows = session.scalars(
                select(Investigation).order_by(Investigation.created_at.desc()).limit(limit)
            ).all()
        return {"investigations": [r.as_dict() for r in rows]}
    except Exception as e:
        logger.exception("history read failed")
        raise HTTPException(status_code=503, detail=f"Audit database unavailable: {e}")


@router.get("/summary")
def summary():
    """Counts for the Overview home (best-effort; zeros if the DB is unavailable)."""
    try:
        from sqlalchemy import func
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
