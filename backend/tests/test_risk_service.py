"""Tests for the risk service layer (business logic between router and ML engine)."""

import pytest

from app.services import risk_service as rs
from app.services.exceptions import (
    RiskEngineUnavailable,
    RiskExplanationNotFound,
    RiskExplanationUnavailable,
    RiskValidationError,
)


class _FakeEngine:
    def __init__(self, shap_sample=None, fail_optimize=False):
        self.shap_sample = shap_sample or {}
        self._fail_optimize = fail_optimize

    def metrics(self, threshold):
        return {"threshold": threshold, "roc_auc": 0.99}

    def alerts(self, threshold, limit):
        return {"threshold": threshold, "limit": limit, "alerts": []}

    def optimize_threshold(self, cost_fn, cost_fp, currency="$"):
        if self._fail_optimize:
            raise ValueError("bad costs")
        return {"cost_fn": cost_fn, "cost_fp": cost_fp, "currency": currency}

    def cross_validate(self):
        return {"folds": 5}


def _use_engine(monkeypatch, engine):
    monkeypatch.setattr(rs, "get_engine", lambda app_state: engine)


def test_engine_unavailable_is_wrapped(monkeypatch):
    def _boom(app_state):
        raise RuntimeError("no trained model")

    monkeypatch.setattr(rs, "get_engine", _boom)
    with pytest.raises(RiskEngineUnavailable):
        rs.get_metrics(app_state=None, threshold=0.5)


def test_metrics_and_alerts_delegate_to_engine(monkeypatch):
    _use_engine(monkeypatch, _FakeEngine())
    assert rs.get_metrics(None, 0.5)["roc_auc"] == 0.99
    assert rs.get_alerts(None, 0.5, 10)["limit"] == 10


def test_threshold_optimization_success_and_failure(monkeypatch):
    _use_engine(monkeypatch, _FakeEngine())
    ok = rs.get_threshold_optimization(None, cost_fn=100, cost_fp=5, currency="INR")
    assert ok["currency"] == "INR"

    _use_engine(monkeypatch, _FakeEngine(fail_optimize=True))
    with pytest.raises(RiskValidationError):
        rs.get_threshold_optimization(None, cost_fn=1, cost_fp=1)


def test_cross_validation_delegates(monkeypatch):
    _use_engine(monkeypatch, _FakeEngine())
    assert rs.run_cross_validation(None)["folds"] == 5


def test_shap_unavailable_when_no_sample(monkeypatch):
    _use_engine(monkeypatch, _FakeEngine(shap_sample={}))
    with pytest.raises(RiskExplanationUnavailable):
        rs.get_shap_explanation(None, 0)


def test_shap_index_out_of_range(monkeypatch):
    _use_engine(monkeypatch, _FakeEngine(shap_sample={"values": [[0.1]]}))
    with pytest.raises(RiskExplanationNotFound):
        rs.get_shap_explanation(None, 5)
