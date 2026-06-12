"""
Risk Service — business logic layer between HTTP routers and the ML engine.

Architectural decision:
  Routers (routers/risk.py) own HTTP concerns: input validation, response shaping,
  HTTP status codes. This service layer owns domain logic: orchestration, rules,
  and decisions about WHAT to return given WHAT the engine produces.

  Benefit: adding a new business rule (e.g. "suppress alerts below a geographic
  whitelist") means editing this service, not the router, not the engine.
  Each layer has a single responsibility and can be tested in isolation.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Request, HTTPException

from ..ml.risk_engine import get_engine, RiskEngine

logger = logging.getLogger("verita.services.risk")


def _require_engine(request: Request) -> RiskEngine:
    """Retrieve the trained engine from app state. Raises HTTP 503 if unavailable."""
    try:
        return get_engine(request.app.state)
    except Exception as e:
        logger.exception("Failed to acquire risk engine")
        raise HTTPException(status_code=503, detail=f"Risk engine unavailable: {e}")


def get_metrics(request: Request, threshold: float) -> dict[str, Any]:
    """
    Return model performance metrics at the given decision threshold.
    Includes ROC-AUC, PR-AUC, confusion matrix, feature importance, and SHAP.
    All numbers are computed from the real held-out test set — nothing is hardcoded.
    """
    engine = _require_engine(request)
    return engine.metrics(threshold=threshold)


def get_alerts(request: Request, threshold: float, limit: int) -> dict[str, Any]:
    """
    Return the AML alert queue: the top-ranked transactions by fraud probability.
    Combines GBM probability score with IsolationForest anomaly score.
    """
    engine = _require_engine(request)
    return engine.alerts(threshold=threshold, limit=limit)


def get_shap_explanation(request: Request, transaction_idx: int) -> dict[str, Any]:
    """
    Return SHAP waterfall values for a specific sample transaction.
    base_value + sum(shap_values) = model output (log-odds).
    Answers: 'Why did the model score THIS transaction at X%?'
    """
    engine = _require_engine(request)

    sample = getattr(engine, "shap_sample", {})
    if not sample or not sample.get("values"):
        raise HTTPException(
            status_code=503,
            detail="SHAP explanations not available — retrain the model with shap>=0.46 installed.",
        )

    n_available = len(sample["values"])
    if transaction_idx < 0 or transaction_idx >= n_available:
        raise HTTPException(
            status_code=404,
            detail=f"Index {transaction_idx} out of range — {n_available} sample rows available.",
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
            "Each shap_value[i] is feature i's contribution. "
            "sum(shap_values) + base_value = model log-odds output."
        ),
    }


def run_cross_validation(request: Request) -> dict[str, Any]:
    """
    Run 5-fold stratified cross-validation and return stability metrics.
    Slow (~2 min) — trains 5 full models. Deterministic with random_state=42.
    """
    engine = _require_engine(request)
    try:
        return engine.cross_validate()
    except Exception as e:
        logger.exception("Cross-validation failed")
        raise HTTPException(status_code=500, detail=f"Cross-validation error: {e}")
