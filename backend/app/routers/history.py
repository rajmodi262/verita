"""
History Router - persisted audit trail.

HTTP adapter only:
GET /api/history/analyses
GET /api/history/queries
GET /api/history/investigations
GET /api/history/summary
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..services.exceptions import AuditTrailUnavailable
from ..services.history_service import (
    recent_analyses as svc_recent_analyses,
    recent_investigations as svc_recent_investigations,
    recent_queries as svc_recent_queries,
    summary_counts as svc_summary_counts,
)

router = APIRouter()


def _history_unavailable(exc: AuditTrailUnavailable) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


@router.get("/analyses")
def recent_analyses(limit: int = Query(20, ge=1, le=100)):
    try:
        return {"analyses": svc_recent_analyses(limit)}
    except AuditTrailUnavailable as exc:
        raise _history_unavailable(exc) from exc


@router.get("/queries")
def recent_queries(limit: int = Query(20, ge=1, le=100)):
    try:
        return {"queries": svc_recent_queries(limit)}
    except AuditTrailUnavailable as exc:
        raise _history_unavailable(exc) from exc


@router.get("/investigations")
def recent_investigations(limit: int = Query(20, ge=1, le=100)):
    try:
        return {"investigations": svc_recent_investigations(limit)}
    except AuditTrailUnavailable as exc:
        raise _history_unavailable(exc) from exc


@router.get("/summary")
def summary():
    return svc_summary_counts()
