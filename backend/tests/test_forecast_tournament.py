"""Tests for the 4-model forecast tournament."""

import numpy as np
import pandas as pd

from app.profiling.profiler import profile_dataframe
from app.profiling.forecast import forecast_series


def _series(values):
    return pd.DataFrame({"date": pd.date_range("2024-01-01", periods=len(values)), "amount": values})


def test_tournament_scores_all_three_and_picks_winner():
    # strong linear trend → a trend model should beat seasonal-naive
    df = _series(np.arange(120) * 10 + 500 + np.random.default_rng(1).normal(0, 20, 120))
    prof = profile_dataframe(df.copy())
    fc = forecast_series(df.copy(), prof.temporals[0], "amount", periods=10)
    assert "error" not in fc
    models = {s["model"] for s in fc["tournament"]}
    # 4-model tournament: linear+seasonality, holt (manual), holt_winters (statsmodels), seasonal_naive
    assert models == {"linear+seasonality", "holt", "holt_winters", "seasonal_naive"}
    # winner is the lowest-MAPE model among those that scored
    scored = [s for s in fc["tournament"] if s["mape"] is not None]
    assert fc["method"] == min(scored, key=lambda s: s["mape"])["model"]
    assert fc["backtest_mape"] == min(s["mape"] for s in scored)


def test_tournament_is_ranked_and_band_ordered():
    df = _series(np.r_[np.arange(60), np.arange(60)[::-1]] * 5 + 200)
    prof = profile_dataframe(df.copy())
    fc = forecast_series(df.copy(), prof.temporals[0], "amount", periods=8)
    mapes = [s["mape"] for s in fc["tournament"] if s["mape"] is not None]
    assert mapes == sorted(mapes)                       # ranked best→worst
    assert all(p["hi"] >= p["y"] >= p["lo"] for p in fc["points"])
    assert len(fc["points"]) == 8
