"""Enterprise-style dataset validation.

This is deliberately separate from profiling. Profiling answers "what can we
visualize?" Validation answers "what would break, mislead, or need analyst review?"
"""

from __future__ import annotations

import hashlib
from typing import Any

import numpy as np
import pandas as pd


def dataframe_fingerprint(df: pd.DataFrame) -> str:
    """Stable SHA-256 fingerprint of values, columns, dtypes, and row order."""
    h = hashlib.sha256()
    h.update("\x1f".join(map(str, df.columns)).encode("utf-8", errors="ignore"))
    h.update("\x1f".join(map(str, df.dtypes)).encode("utf-8", errors="ignore"))
    h.update(str(df.shape).encode())
    values = pd.util.hash_pandas_object(df.astype("string").fillna("<NA>"), index=True)
    h.update(values.to_numpy(dtype=np.uint64).tobytes())
    return h.hexdigest()


def _role_present(profile: Any, attr: str) -> bool:
    return bool(getattr(profile, attr, []))


def _money_columns(profile: Any) -> list[str]:
    return [
        c
        for c in getattr(profile, "measures", [])
        if any(h in c.lower() for h in ("amount", "amt", "value", "revenue", "cost", "volume", "total"))
    ]


def _column_checks(df: pd.DataFrame, profile: Any) -> list[dict[str, Any]]:
    by_name = {c.name: c for c in getattr(profile, "columns", [])}
    checks: list[dict[str, Any]] = []
    for name in df.columns:
        col = by_name.get(str(name))
        series = df[name]
        row_count = max(len(series), 1)
        missing = int(series.isna().sum())
        check: dict[str, Any] = {
            "name": str(name),
            "semantic_type": getattr(col, "semantic_type", "unknown"),
            "dtype": str(series.dtype),
            "missing_count": missing,
            "missing_pct": round(missing / row_count * 100, 2),
            "unique_count": int(series.nunique(dropna=True)),
            "status": "pass",
            "warnings": [],
        }

        if check["missing_pct"] >= 30:
            check["status"] = "review"
            check["warnings"].append("High null rate can bias aggregates or model features.")
        if getattr(col, "semantic_type", "") == "measure":
            numeric = pd.to_numeric(series, errors="coerce")
            coercion_failures = int(numeric.isna().sum() - series.isna().sum())
            if coercion_failures:
                check["status"] = "review"
                check["coercion_failures"] = coercion_failures
                check["warnings"].append("Some non-null values failed numeric coercion.")
            outliers = getattr(col, "outlier_count", None)
            if outliers:
                outlier_pct = round(outliers / row_count * 100, 2)
                check["outlier_count"] = int(outliers)
                check["outlier_pct"] = outlier_pct
                if outlier_pct >= 5:
                    check["status"] = "review"
                    check["warnings"].append("High outlier rate; inspect before trusting averages.")
        if getattr(col, "semantic_type", "") == "temporal":
            parsed = pd.to_datetime(series, errors="coerce")
            coercion_failures = int(parsed.isna().sum() - series.isna().sum())
            if coercion_failures:
                check["status"] = "review"
                check["coercion_failures"] = coercion_failures
                check["warnings"].append("Some non-null values failed datetime parsing.")
        checks.append(check)
    return checks


def build_validation_report(df: pd.DataFrame, profile: Any) -> dict[str, Any]:
    """Return an auditable validation report for a profiled dataset."""
    duplicate_rows = int(df.duplicated().sum())
    id_duplicate_rows = 0
    id_columns = list(getattr(profile, "identifiers", []))
    if id_columns:
        id_duplicate_rows = int(df[id_columns[0]].duplicated().sum())

    coverage = [
        {"signal": "amount_or_value_measure", "present": bool(_money_columns(profile)), "columns": _money_columns(profile)},
        {"signal": "time_column", "present": _role_present(profile, "temporals"), "columns": list(getattr(profile, "temporals", []))},
        {"signal": "geography_column", "present": _role_present(profile, "geos"), "columns": list(getattr(profile, "geos", []))},
        {"signal": "categorical_dimension", "present": _role_present(profile, "dimensions"), "columns": list(getattr(profile, "dimensions", [])[:5])},
        {"signal": "flag_or_boolean", "present": _role_present(profile, "booleans"), "columns": list(getattr(profile, "booleans", []))},
        {"signal": "free_text_narrative", "present": _role_present(profile, "texts"), "columns": list(getattr(profile, "texts", []))},
    ]

    warnings: list[dict[str, Any]] = []
    if duplicate_rows:
        warnings.append({
            "severity": "warning",
            "code": "duplicate_rows",
            "message": f"{duplicate_rows:,} exact duplicate row(s) detected.",
            "evidence": {"duplicate_rows": duplicate_rows},
        })
    if id_duplicate_rows:
        warnings.append({
            "severity": "critical",
            "code": "duplicate_ids",
            "message": f"{id_duplicate_rows:,} duplicate values in identifier column '{id_columns[0]}'.",
            "evidence": {"column": id_columns[0], "duplicate_ids": id_duplicate_rows},
        })
    missing_signals = [item["signal"] for item in coverage if not item["present"]]
    for signal in missing_signals:
        warnings.append({
            "severity": "info",
            "code": f"missing_{signal}",
            "message": f"No {signal.replace('_', ' ')} detected; related analytics will be limited.",
            "evidence": {"signal": signal},
        })

    rejected_candidates = df[df.isna().mean(axis=1) >= 0.5].head(5)
    column_checks = _column_checks(df, profile)
    review_columns = [c for c in column_checks if c["status"] != "pass"]

    return {
        "dataset_hash": dataframe_fingerprint(df),
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "duplicate_rows": duplicate_rows,
        "duplicate_identifier_rows": id_duplicate_rows,
        "domain_coverage": coverage,
        "column_checks": column_checks,
        "warnings": warnings,
        "review_column_count": len(review_columns),
        "rejected_row_sample": rejected_candidates.astype(object).where(rejected_candidates.notna(), None).to_dict(orient="records"),
        "attestation": (
            "Validation is computed before dashboard generation from the uploaded rows: "
            "schema coverage, nulls, coercion failures, duplicates, and outlier warnings."
        ),
    }
