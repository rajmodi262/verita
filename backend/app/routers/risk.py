"""
Risk Router — FCC fraud scoring + anomaly alert queue.

Architecture: Router → Service → Engine.
This router owns HTTP concerns only: input validation, query parameters, response
shaping, and HTTP status codes. Business logic lives in services/risk_service.py.

GET /api/risk/metrics?threshold=     → ROC/PR curves, confusion matrix, feature importance, SHAP
GET /api/risk/alerts?threshold=      → ranked AML alert queue
GET /api/risk/explain/{idx}          → SHAP waterfall for a specific transaction row
GET /api/risk/cross-validate         → 5-fold stratified CV (slow, ~2 min — run once, cache in UI)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, Request

from ..services.exceptions import (
    RiskEngineUnavailable,
    RiskExplanationNotFound,
    RiskExplanationUnavailable,
    RiskValidationError,
)
from ..services.risk_service import (
    get_metrics as svc_metrics,
    get_alerts as svc_alerts,
    get_shap_explanation as svc_explain,
    run_cross_validation as svc_cv,
    get_threshold_optimization as svc_optimize,
)

logger = logging.getLogger("verita.risk")
router = APIRouter()


@router.get("/metrics")
def risk_metrics(request: Request, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    try:
        return svc_metrics(request.app.state, threshold)
    except RiskEngineUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("risk metrics failed")
        raise HTTPException(status_code=500, detail=f"Risk model error: {e}")


@router.get("/alerts")
def risk_alerts(
    request: Request,
    threshold: float = Query(0.5, ge=0.0, le=1.0),
    limit: int = Query(25, ge=1, le=100),
):
    try:
        return svc_alerts(request.app.state, threshold, limit)
    except RiskEngineUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("risk alerts failed")
        raise HTTPException(status_code=500, detail=f"Risk model error: {e}")


@router.get("/explain/{transaction_idx}")
def explain_transaction(transaction_idx: int, request: Request):
    """
    Return SHAP waterfall values for a single sample transaction row.
    Provides a per-feature breakdown of why the model scored this transaction
    as it did — base_value + sum(shap_values) = model output (log-odds).

    Use this to answer: "Why did the model score this transaction at 79%?"
    """
    try:
        return svc_explain(request.app.state, transaction_idx)
    except RiskEngineUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RiskExplanationUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RiskExplanationNotFound as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        logger.exception("SHAP explain failed")
        raise HTTPException(status_code=500, detail=f"SHAP error: {e}")


@router.get("/optimal-threshold")
def optimal_threshold(
    request: Request,
    cost_fn: float = Query(500.0, gt=0, description="Cost of one MISSED fraud (false negative)"),
    cost_fp: float = Query(5.0, gt=0, description="Cost of one FALSE ALARM (false positive)"),
    currency: str = Query("$", max_length=3, description="Currency symbol for the readable text ($, ₹, …)"),
):
    """
    Cost-sensitive decision threshold. Given the cost of a missed fraud vs a false alarm (in any
    currency), return the threshold that minimises expected loss on the held-out set — plus the
    money saved versus a naive 0.5 cut-off. This is the rigorous answer to "why this threshold?".
    """
    try:
        return svc_optimize(request.app.state, cost_fn, cost_fp, currency)
    except RiskEngineUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RiskValidationError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("optimal-threshold failed")
        raise HTTPException(status_code=500, detail=f"Threshold optimization error: {e}")


@router.get("/cross-validate")
def cross_validate(request: Request):
    """
    Run 5-fold stratified cross-validation on the full dataset.
    Each fold trains a fresh GBM and evaluates ROC-AUC on the held-out fold.
    Returns per-fold scores, mean ± std, and a consistency check against the
    main held-out score.

    NOTE: This is slow (~2 min on the first call) because it trains 5 full models.
    Run it once; the result is deterministic for the same data and random_state=42.
    """
    try:
        return svc_cv(request.app.state)
    except RiskEngineUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except RiskValidationError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("cross-validation failed")
        raise HTTPException(status_code=500, detail=f"Cross-validation error: {e}")
