"""Tests for the FCC risk engine — honest, threshold-driven, and structurally sound."""

import numpy as np
import pytest

from app.ml.risk_engine import RiskEngine


@pytest.fixture(scope="module")
def engine():
    eng = RiskEngine()
    eng.train()
    return eng


def test_trains_and_beats_random(engine):
    m = engine.metrics(0.5)
    assert m["roc_auc"] > 0.7  # a real model must beat coin-flip comfortably
    assert 0 <= m["precision"] <= 1 and 0 <= m["recall"] <= 1
    assert m["test_size"] > 0 and m["fraud_in_test"] > 0


def test_threshold_monotonicity(engine):
    """Lowering the threshold cannot reduce recall (more positives caught)."""
    hi = engine.metrics(0.8)["recall"]
    lo = engine.metrics(0.2)["recall"]
    assert lo >= hi


def test_curves_and_confusion_consistent(engine):
    m = engine.metrics(0.5)
    cm = m["confusion_matrix"]
    assert cm["tp"] + cm["fn"] == m["fraud_in_test"]
    assert cm["tp"] + cm["fp"] + cm["tn"] + cm["fn"] == m["test_size"]
    assert len(m["roc_curve"]) > 1 and len(m["pr_curve"]) > 1
    # ROC curve runs from ~ (0,0) to (1,1)
    assert m["roc_curve"][0]["x"] <= 0.05 and m["roc_curve"][-1]["x"] >= 0.95


def test_feature_importance_sums_and_ranks(engine):
    fi = engine.metrics(0.5)["feature_importance"]
    assert abs(sum(f["importance"] for f in fi) - 1.0) < 0.05  # GBM importances ~ sum to 1
    assert fi == sorted(fi, key=lambda f: -f["importance"])     # already ranked


def test_alerts_rank_and_map_back(engine):
    a = engine.alerts(0.5, 20)
    alerts = a["alerts"]
    assert len(alerts) == 20
    scores = [x["risk_score"] for x in alerts]
    assert scores == sorted(scores, reverse=True)               # ranked by risk
    # each alert maps to a real source transaction
    assert all(x["transaction_id"].startswith("TX") for x in alerts)
    # top alerts should over-index on actual fraud (the model works)
    top_fraud_rate = np.mean([x["is_fraud_actual"] for x in alerts[:10]])
    assert top_fraud_rate > engine.metrics(0.5)["fraud_in_test"] / engine.metrics(0.5)["test_size"]


def test_data_source_is_labeled(engine):
    assert engine.metrics(0.5)["data_source"] in ("synthetic_fcc", "ulb_creditcard")
