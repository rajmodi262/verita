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

from ..ml.risk_engine import get_engine, RiskEngine
from .exceptions import (
    RiskEngineUnavailable,
    RiskExplanationNotFound,
    RiskExplanationUnavailable,
    RiskValidationError,
)

logger = logging.getLogger("verita.services.risk")


def _require_engine(app_state: Any) -> RiskEngine:
    """Retrieve the trained engine from app state."""
    try:
        return get_engine(app_state)
    except Exception as e:
        logger.exception("Failed to acquire risk engine")
        raise RiskEngineUnavailable(f"Risk engine unavailable: {e}") from e


def get_metrics(app_state: Any, threshold: float) -> dict[str, Any]:
    """
    Return model performance metrics at the given decision threshold.
    Includes ROC-AUC, PR-AUC, confusion matrix, feature importance, and SHAP.
    All numbers are computed from the real held-out test set — nothing is hardcoded.
    """
    engine = _require_engine(app_state)
    return engine.metrics(threshold=threshold)


def get_alerts(app_state: Any, threshold: float, limit: int) -> dict[str, Any]:
    """
    Return the AML alert queue: the top-ranked transactions by fraud probability.
    Combines GBM probability score with IsolationForest anomaly score.
    """
    engine = _require_engine(app_state)
    return engine.alerts(threshold=threshold, limit=limit)


def get_shap_explanation(app_state: Any, transaction_idx: int) -> dict[str, Any]:
    """
    Return SHAP waterfall values for a specific sample transaction.
    base_value + sum(shap_values) = model output (log-odds).
    Answers: 'Why did the model score THIS transaction at X%?'
    """
    engine = _require_engine(app_state)

    sample = getattr(engine, "shap_sample", {})
    if not sample or not sample.get("values"):
        raise RiskExplanationUnavailable(
            "SHAP explanations not available - retrain the model with shap>=0.46 installed."
        )

    n_available = len(sample["values"])
    if transaction_idx < 0 or transaction_idx >= n_available:
        raise RiskExplanationNotFound(
            f"Index {transaction_idx} out of range - {n_available} sample rows available."
        )

    # Translate the raw SHAP vector into ranked plain-English reason codes (adverse-action
    # style). Additive — the raw values are still returned for the waterfall chart; this just
    # gives an analyst a sentence they can paste into a case note. Never crash the endpoint if
    # the human-readable layer hits an edge case.
    from ..ml.model_explainer import reason_codes

    space = sample.get("output_space", "logodds")
    if space == "probability":
        interp = (
            "SHAP (SHapley Additive exPlanations) — interventional TreeExplainer in PROBABILITY "
            "space. base_value is the model's average fraud probability over the background set. "
            "Each shap_value[i] is feature i's contribution to the probability. "
            "sum(shap_values) + base_value = predict_proba (the fraud probability)."
        )
    else:
        interp = (
            "SHAP (SHapley Additive exPlanations) — TreeExplainer. base_value is the model's "
            "average log-odds prediction. Each shap_value[i] is feature i's contribution. "
            "sum(shap_values) + base_value = model log-odds output."
        )
    explanation: dict[str, Any] = {
        "transaction_idx": transaction_idx,
        "feature_names": sample["feature_names"],
        "shap_values": sample["values"][transaction_idx],
        "base_value": sample["base_value"],
        "feature_data": sample["data"][transaction_idx],
        "output_space": space,
        "interpretation": interp,
    }
    try:
        explanation["plain_english"] = reason_codes(
            feature_names=sample["feature_names"],
            shap_values=sample["values"][transaction_idx],
            feature_values=sample["data"][transaction_idx],
            base_value=sample["base_value"],
            output_space=sample.get("output_space", "logodds"),
        )
    except Exception as e:  # pragma: no cover - defensive; raw SHAP still returned
        logger.warning("reason-code generation failed: %s", e)
    return explanation


def get_threshold_optimization(
    app_state: Any, cost_fn: float, cost_fp: float, currency: str = "$"
) -> dict[str, Any]:
    """
    Return the expected-cost-optimal decision threshold given the cost of a missed fraud (false
    negative) vs a false alarm (false positive), in whatever currency the caller passes. This is
    the decision-theory answer to "what threshold should we actually run?" — and reports the money
    saved vs a naive 0.5 cut-off.
    """
    engine = _require_engine(app_state)
    try:
        return engine.optimize_threshold(cost_fn=cost_fn, cost_fp=cost_fp, currency=currency)
    except Exception as e:
        logger.exception("threshold optimization failed")
        raise RiskValidationError(f"Threshold optimization error: {e}") from e


def run_cross_validation(app_state: Any) -> dict[str, Any]:
    """
    Run 5-fold stratified cross-validation and return stability metrics.
    Slow (~2 min) — trains 5 full models. Deterministic with random_state=42.
    """
    engine = _require_engine(app_state)
    try:
        return engine.cross_validate()
    except Exception as e:
        logger.exception("Cross-validation failed")
        raise RiskValidationError(f"Cross-validation error: {e}") from e
