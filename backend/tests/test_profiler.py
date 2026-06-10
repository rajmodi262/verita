"""Tests for the dataset profiler — semantic role inference is the core of the Studio."""

import numpy as np
import pandas as pd

from app.profiling import profile_dataframe


def _sample_df(n: int = 400) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    dates = pd.date_range("2024-01-01", periods=120, freq="D")
    return pd.DataFrame(
        {
            "transaction_id": [f"TX{i:06d}" for i in range(n)],
            "timestamp": rng.choice(dates, n).astype(str),
            "amount": rng.lognormal(6, 1.2, n).round(2),
            "channel": rng.choice(["Wire", "Card", "ACH", "SWIFT"], n),
            "country": rng.choice(["US", "GB", "DE", "KY"], n),
            "risk_score": rng.integers(0, 100, n),
            "is_fraud": rng.choice([0, 1], n, p=[0.97, 0.03]),
        }
    )


def test_semantic_roles_are_inferred_correctly():
    prof = profile_dataframe(_sample_df())
    roles = {c.name: c.semantic_type for c in prof.columns}

    assert roles["transaction_id"] == "identifier"
    assert roles["timestamp"] == "temporal"
    assert roles["amount"] == "measure"
    assert roles["risk_score"] == "measure"
    assert roles["channel"] == "dimension"
    assert roles["country"] == "geo"
    assert roles["is_fraud"] == "boolean"


def test_role_buckets_match_columns():
    prof = profile_dataframe(_sample_df())
    assert "amount" in prof.measures
    assert "timestamp" in prof.temporals
    assert "is_fraud" in prof.booleans
    assert prof.row_count == 400
    assert prof.column_count == 7


def test_numeric_stats_present_for_measures():
    prof = profile_dataframe(_sample_df())
    amount = next(c for c in prof.columns if c.name == "amount")
    assert amount.mean is not None and amount.mean > 0
    assert amount.min is not None and amount.max is not None
    assert amount.outlier_count is not None


def test_handles_empty_and_single_column():
    prof = profile_dataframe(pd.DataFrame({"x": [1, 2, 3]}))
    assert prof.row_count == 3
    assert prof.column_count == 1
