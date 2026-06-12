"""
Risk Router — FCC fraud scoring + anomaly alert queue.

GET /api/risk/metrics?threshold=     → ROC/PR curves, confusion matrix, feature importance, SHAP
GET /api/risk/alerts?threshold=      → ranked AML alert queue
GET /api/risk/explain/{idx}          → SHAP waterfall for a specific transaction row
GET /api/risk/cross-validate         → 5-fold stratified CV (slow, ~2 min — run once, cache in UI)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, Request

from ..ml.risk_engine import get_engine

logger = logging.getLogger("verita.risk")
router = APIRouter()


@router.get("/metrics")
def risk_metrics(request: Request, threshold: float = Query(0.5, ge=0.0, le=1.0)):
    try:
        return get_engine(request.app.state).metrics(threshold)
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
        return get_engine(request.app.state).alerts(threshold, limit)
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
        engine = get_engine(request.app.state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk model error: {e}")

    sample = getattr(engine, "shap_sample", {})
    if not sample or not sample.get("values"):
        raise HTTPException(
            status_code=503,
            detail="SHAP explanations not available — install shap>=0.46 and retrain the model.",
        )
    n_available = len(sample["values"])
    if transaction_idx < 0 or transaction_idx >= n_available:
        raise HTTPException(
            status_code=404,
            detail=f"Index {transaction_idx} out of range — {n_available} sample rows available (0-{n_available-1}).",
        )
    return {
        "transaction_idx": transaction_idx,
        "feature_names": sample["feature_names"],
        "shap_values": sample["values"][transaction_idx],
        "base_value": sample["base_value"],
        "feature_data": sample["data"][transaction_idx],
        "interpretation": (
            "SHAP (SHapley Additive exPlanations) — TreeExplainer (exact, not sampled). "
            "base_value is the model's average log-odds prediction. "
            "Each shap_value[i] is feature i's contribution to pushing the prediction "
            "above or below that baseline. sum(shap_values) + base_value = model output."
        ),
    }


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
        engine = get_engine(request.app.state)
        return engine.cross_validate()
    except Exception as e:
        logger.exception("cross-validation failed")
        raise HTTPException(status_code=500, detail=f"Cross-validation error: {e}")
