"""Tests for the cost-sensitive decision + reason-code explainer layer."""

import numpy as np
import pytest

from app.ml.model_explainer import (
    optimal_threshold,
    population_stability_index,
    reason_codes,
)


# ── reason codes ──────────────────────────────────────────────────────────────

def test_reason_codes_additivity_and_ranking():
    names = ["amount_log", "geo_risk", "hour_of_day", "channel_risk"]
    shap = [0.8, 1.4, -0.3, 0.2]   # geo_risk is the biggest mover
    out = reason_codes(names, shap, feature_values=[9.1, 0.85, 2.0, 0.9], base_value=-3.0, top_k=4)

    # base + sum(shap) must equal the reported logit (SHAP local accuracy)
    assert out["model_logit"] == pytest.approx(-3.0 + sum(shap), abs=1e-6)
    # probability is the sigmoid of that logit
    assert 0.0 <= out["predicted_probability"] <= 1.0
    # drivers are ranked by |shap| — geo_risk first
    assert out["reason_codes"][0]["feature"] == "geo_risk"
    assert out["reason_codes"][0]["direction"] == "raises_risk"
    # the negative contributor is labelled as lowering risk
    hour = next(d for d in out["reason_codes"] if d["feature"] == "hour_of_day")
    assert hour["direction"] == "lowers_risk"


def test_reason_codes_handles_anonymized_features():
    # ULB PCA components carry no business meaning — explainer must stay honest, not invent one.
    names = ["V14", "V4", "Amount"]
    out = reason_codes(names, [-2.1, 1.0, 0.4], base_value=-1.0)
    v14 = out["reason_codes"][0]
    assert v14["feature"] == "V14"
    assert "anonymize" in v14["reason"].lower() or "hidden" in v14["reason"].lower()


def test_reason_codes_length_mismatch_raises():
    with pytest.raises(ValueError):
        reason_codes(["a", "b"], [0.1, 0.2, 0.3])


# ── cost-sensitive threshold ──────────────────────────────────────────────────

def test_optimal_threshold_beats_or_matches_default():
    rng = np.random.default_rng(0)
    y = (rng.random(2000) < 0.02).astype(int)          # 2% fraud, like real data
    # Give the "model" real signal: fraud scores skew high, legit skews low.
    p = np.where(y == 1, rng.beta(6, 2, 2000), rng.beta(2, 6, 2000))
    out = optimal_threshold(y, p, cost_fn=500, cost_fp=5)

    # By construction the optimum cannot cost more than the 0.5 baseline.
    assert out["optimal"]["expected_cost"] <= out["baseline_0_5"]["expected_cost"] + 1e-6
    assert out["savings_vs_0_5"] >= 0
    assert 0.0 < out["optimal_threshold"] < 1.0


def test_optimal_threshold_shifts_lower_when_misses_cost_more():
    rng = np.random.default_rng(1)
    y = (rng.random(2000) < 0.05).astype(int)
    p = np.where(y == 1, rng.beta(5, 3, 2000), rng.beta(3, 5, 2000))
    cheap_miss = optimal_threshold(y, p, cost_fn=50, cost_fp=50)["optimal_threshold"]
    dear_miss = optimal_threshold(y, p, cost_fn=5000, cost_fp=5)["optimal_threshold"]
    # When a missed fraud is far costlier, we should cast a wider net (lower threshold).
    assert dear_miss <= cheap_miss


def test_optimal_threshold_rejects_bad_input():
    with pytest.raises(ValueError):
        optimal_threshold([], [])


# ── PSI drift ─────────────────────────────────────────────────────────────────

def test_psi_zero_for_same_distribution():
    rng = np.random.default_rng(2)
    base = rng.normal(0, 1, 5000)
    same = rng.normal(0, 1, 5000)
    out = population_stability_index(base, same)
    assert out["psi"] < 0.1
    assert out["severity"] == "none"


def test_psi_flags_major_shift():
    rng = np.random.default_rng(3)
    base = rng.normal(0, 1, 5000)
    shifted = rng.normal(3, 1, 5000)   # mean shifted by 3 sd — a major drift
    out = population_stability_index(base, shifted)
    assert out["psi"] >= 0.25
    assert out["severity"] == "major"
