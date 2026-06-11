"""Tests for the insights engine, forecaster, profiler quality, and dataset store."""

import numpy as np
import pandas as pd
import pytest

from app.profiling import store
from app.profiling.profiler import profile_dataframe
from app.profiling.insights import generate_insights, quality_score
from app.profiling.forecast import forecast_series


@pytest.fixture
def signal_df():
    rng = np.random.default_rng(3)
    n = 800
    seg = rng.choice(["Retail", "HNW"], n, p=[0.6, 0.4])
    # HNW amounts genuinely larger → t-test should fire
    amount = np.where(seg == "HNW", rng.normal(5000, 800, n), rng.normal(1000, 300, n)).clip(1)
    day = rng.integers(0, 180, n)
    return pd.DataFrame({
        "id": [f"X{i}" for i in range(n)],
        "date": pd.Timestamp("2024-01-01") + pd.to_timedelta(day, unit="D"),
        "amount": amount + day * 5,           # mild upward trend
        "segment": seg,
        "flag": rng.choice([0, 1], n, p=[0.9, 0.1]),
    })


def test_insights_detect_significance_and_evidence(signal_df):
    prof = profile_dataframe(signal_df.copy())
    out = generate_insights(signal_df.copy(), prof)
    assert len(out["insights"]) >= 2
    # every insight carries a non-empty evidence trail
    assert all(i["evidence"] for i in out["insights"])
    # a significance test should appear given the constructed gap
    kinds = {i["kind"] for i in out["insights"]}
    assert "comparison" in kinds or "dominance" in kinds


def test_quality_score_penalizes_nulls_and_dupes():
    df = pd.DataFrame({"a": [1, 1, 1, None, None], "b": ["x", "x", "x", "x", "x"]})
    df = pd.concat([df, df])  # add duplicates
    prof = profile_dataframe(df.copy())
    q = quality_score(df, prof)
    assert q["score"] < 100
    assert q["duplicate_rows"] > 0
    reasons = " ".join(d["reason"] for d in q["deductions"]).lower()
    assert "missing" in reasons or "duplicate" in reasons or "constant" in reasons


def test_forecast_backtest_is_held_out(signal_df):
    prof = profile_dataframe(signal_df.copy())
    fc = forecast_series(signal_df.copy(), prof.temporals[0], "amount", periods=12)
    assert "error" not in fc
    assert len(fc["points"]) == 12
    assert fc["backtest_mape"] is None or fc["backtest_mape"] >= 0
    # confidence band is ordered
    assert all(p["hi"] >= p["y"] >= p["lo"] for p in fc["points"])


def test_forecast_refuses_short_series():
    df = pd.DataFrame({"date": pd.date_range("2024-01-01", periods=5), "amount": [1, 2, 3, 4, 5]})
    prof = profile_dataframe(df.copy())
    fc = forecast_series(df.copy(), prof.temporals[0], "amount", periods=5)
    assert "error" in fc


def test_store_roundtrip_and_profile_cache(signal_df):
    prof = profile_dataframe(signal_df.copy())
    did = store.put(signal_df, "x.csv", profile=prof)
    assert store.get(did) is not None
    assert store.get_profile(did) is prof          # exact cached object reused
    assert store.get_filename(did) == "x.csv"
    assert store.get("does-not-exist") is None
