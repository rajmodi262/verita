"""Tests for the dashboard recommendation engine."""

import numpy as np
import pandas as pd

from app.profiling import profile_dataframe, recommend_dashboard


def _df(n: int = 400) -> pd.DataFrame:
    rng = np.random.default_rng(11)
    dates = pd.date_range("2024-01-01", periods=120, freq="D")
    return pd.DataFrame(
        {
            "timestamp": rng.choice(dates, n).astype(str),
            "amount": rng.lognormal(6, 1.2, n).round(2),
            "channel": rng.choice(["Wire", "Card", "ACH", "SWIFT"], n),
            "is_fraud": rng.choice([0, 1], n, p=[0.97, 0.03]),
        }
    )


def test_dashboard_contains_kpis_and_charts():
    df = _df()
    dash = recommend_dashboard(df, profile_dataframe(df))
    types = [c["chart_type"] for c in dash]
    assert "kpi" in types
    assert "line" in types  # temporal + measure -> time series
    assert any(t in types for t in ("bar", "pie"))  # categorical breakdown


def test_fraud_rate_kpi_is_emitted_for_boolean():
    df = _df()
    dash = recommend_dashboard(df, profile_dataframe(df))
    kpis = [c for c in dash if c["chart_type"] == "kpi"]
    titles = " ".join(k["title"].lower() for k in kpis)
    assert "is_fraud" in titles  # FCC-relevant rate KPI


def test_every_chart_has_renderable_payload():
    df = _df()
    dash = recommend_dashboard(df, profile_dataframe(df))
    for c in dash:
        assert "title" in c and "id" in c
        if c["chart_type"] != "kpi":
            assert "data" in c and isinstance(c["data"], list)


def test_no_temporal_means_no_line_chart():
    df = pd.DataFrame({"channel": ["A", "B", "A", "C"], "amount": [1.0, 2.0, 3.0, 4.0]})
    dash = recommend_dashboard(df, profile_dataframe(df))
    assert "line" not in [c["chart_type"] for c in dash]
