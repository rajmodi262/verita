"""
Risk Router — FCC fraud scoring + anomaly alert queue.

GET /api/risk/metrics?threshold=  → ROC/PR curves, confusion matrix, feature importance
GET /api/risk/alerts?threshold=   → ranked AML alert queue
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query, Request

from ..ml.risk_engine import get_engine

logger = logging.getLogger("verita.risk")
router = APIRouter()


@router.get("/metrics")
def risk_metrics(request: Request, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    engine = get_engine(request.app.state)
    return engine.metrics(threshold)


@router.get("/alerts")
def risk_alerts(
    request: Request,
    threshold: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(25, ge=1, le=100),
):
    engine = get_engine(request.app.state)
    return engine.alerts(threshold, limit)
