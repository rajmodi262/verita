"""Tests for the enterprise dataset-validation layer."""

import types

import pandas as pd

from app.services import data_validation as dv


def _col(name, semantic_type="dimension", **kw):
    return types.SimpleNamespace(name=name, semantic_type=semantic_type, **kw)


def _profile(**kw):
    defaults = dict(
        measures=[], temporals=[], geos=[], dimensions=[],
        booleans=[], texts=[], identifiers=[], columns=[],
    )
    defaults.update(kw)
    return types.SimpleNamespace(**defaults)


def test_fingerprint_is_stable_and_value_sensitive():
    df1 = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
    df2 = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})
    df3 = pd.DataFrame({"a": [1, 2, 4], "b": ["x", "y", "z"]})
    h1 = dv.dataframe_fingerprint(df1)
    assert h1 == dv.dataframe_fingerprint(df2)   # deterministic
    assert h1 != dv.dataframe_fingerprint(df3)   # sensitive to a single value change
    assert len(h1) == 64                         # sha-256 hex digest


def test_report_flags_duplicate_identifiers_and_missing_signals():
    df = pd.DataFrame({
        "id": [1, 2, 2, 4],                      # duplicate identifier value
        "amount": [10.0, 20.0, None, 40.0],
        "city": ["A", "B", "A", "C"],
    })
    profile = _profile(
        measures=["amount"],
        dimensions=["city"],
        identifiers=["id"],
        columns=[
            _col("id", "identifier"),
            _col("amount", "measure", outlier_count=0),
            _col("city", "dimension"),
        ],
    )
    report = dv.build_validation_report(df, profile)

    assert report["row_count"] == 4
    assert report["column_count"] == 3
    assert report["duplicate_identifier_rows"] == 1
    assert len(report["dataset_hash"]) == 64
    assert len(report["column_checks"]) == 3

    codes = {w["code"] for w in report["warnings"]}
    assert "duplicate_ids" in codes              # critical: repeated primary key
    assert "missing_time_column" in codes        # info: signal absent from profile
    assert "missing_geography_column" in codes

    coverage = {c["signal"]: c["present"] for c in report["domain_coverage"]}
    assert coverage["amount_or_value_measure"] is True
    assert coverage["categorical_dimension"] is True
    assert coverage["time_column"] is False


def test_column_check_marks_high_null_and_outliers_for_review():
    df = pd.DataFrame({"amount": [1.0, None, None, None]})   # 75% null
    profile = _profile(
        measures=["amount"],
        columns=[_col("amount", "measure", outlier_count=3)],
    )
    report = dv.build_validation_report(df, profile)
    check = next(c for c in report["column_checks"] if c["name"] == "amount")
    assert check["status"] == "review"
    assert check["missing_pct"] >= 30
    assert check["outlier_pct"] >= 5
    assert report["review_column_count"] >= 1


def test_temporal_coercion_failures_flagged():
    df = pd.DataFrame({"when": ["2021-01-01", "not-a-date", "2021-03-01"]})
    profile = _profile(temporals=["when"], columns=[_col("when", "temporal")])
    report = dv.build_validation_report(df, profile)
    check = next(c for c in report["column_checks"] if c["name"] == "when")
    assert check["status"] == "review"
    assert check.get("coercion_failures", 0) >= 1


def test_report_detects_exact_duplicate_rows():
    df = pd.DataFrame({"a": [1, 1], "b": ["x", "x"]})       # identical rows
    profile = _profile(columns=[_col("a"), _col("b")])
    report = dv.build_validation_report(df, profile)
    assert report["duplicate_rows"] == 1
    assert any(w["code"] == "duplicate_rows" for w in report["warnings"])
