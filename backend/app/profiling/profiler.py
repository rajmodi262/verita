"""
Verita — Dataset Profiler

The heart of the Auto-Dashboard Studio. Given an arbitrary tabular dataset, infer the
*semantic role* of every column (not just its dtype) and compute the statistics a dashboard
recommender needs to decide what to show. Everything here is computed from the real data —
no placeholders.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any

import numpy as np
import pandas as pd

# Semantic roles drive chart recommendation downstream.
MEASURE = "measure"        # numeric quantity you aggregate (amount, count, score)
DIMENSION = "dimension"    # low-cardinality category you group by (channel, status)
TEMPORAL = "temporal"      # date / datetime you trend over
IDENTIFIER = "identifier"  # high-cardinality key (transaction_id) — not for charts
BOOLEAN = "boolean"        # true/false flag
TEXT = "text"              # free text (narratives) — for NLP, not bar charts
GEO = "geo"                # geographic dimension (country / state)

# Hints used for semantic inference.
_ID_NAME_HINTS = ("id", "key", "uuid", "guid", "hash", "ref", "number", "no", "code")
_GEO_NAME_HINTS = ("country", "state", "region", "city", "geography", "geo", "nation", "province")
_AMOUNT_NAME_HINTS = ("amount", "amt", "value", "price", "cost", "revenue", "balance", "volume", "total")
_DATE_NAME_HINTS = ("date", "time", "timestamp", "datetime", "day", "month", "year", "created", "updated")


@dataclass
class ColumnProfile:
    name: str
    dtype: str
    semantic_type: str
    missing_count: int
    missing_pct: float
    unique_count: int
    unique_pct: float
    # numeric-only
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    std: float | None = None
    p25: float | None = None
    p75: float | None = None
    skew: float | None = None
    outlier_count: int | None = None
    # categorical-only
    top_values: list[dict[str, Any]] | None = None
    # temporal-only
    min_date: str | None = None
    max_date: str | None = None
    range_days: int | None = None
    # text-only
    avg_length: float | None = None
    sample_values: list[str] = field(default_factory=list)


@dataclass
class DatasetProfile:
    row_count: int
    column_count: int
    memory_kb: float
    columns: list[ColumnProfile]
    # convenience role buckets for the recommender
    measures: list[str]
    dimensions: list[str]
    temporals: list[str]
    identifiers: list[str]
    booleans: list[str]
    texts: list[str]
    geos: list[str]

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        return d


def _name_hits(name: str, hints: tuple[str, ...]) -> bool:
    tokens = re.split(r"[\s_\-.]+", name.lower())
    return any(h in tokens or h in name.lower() for h in hints)


def _coerce_datetime(series: pd.Series) -> pd.Series:
    """Coerce to datetime robustly across pandas versions.

    Plain ``errors="coerce"`` parses ISO-like timestamps on every pandas version. We deliberately
    avoid ``format="mixed"`` because on pandas < 2.0 it is treated as a literal strftime pattern and
    silently yields all-NaT, which breaks date detection on older installs.
    """
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # silence pandas' mixed-format inference notice
        return pd.to_datetime(series, errors="coerce")


def _try_parse_datetime(series: pd.Series) -> pd.Series | None:
    """Attempt to coerce an object/string column to datetime. Returns None if it isn't one."""
    non_null = series.dropna()
    if non_null.empty:
        return None
    parsed = _coerce_datetime(non_null.head(200))
    # Require the strong majority to parse cleanly before calling it temporal.
    if parsed.notna().mean() >= 0.8:
        return _coerce_datetime(series)
    return None


def _infer_semantic_type(name: str, series: pd.Series, n_rows: int) -> tuple[str, pd.Series]:
    """Return (semantic_type, possibly-coerced series)."""
    nunique = series.nunique(dropna=True)
    unique_ratio = nunique / max(n_rows, 1)

    # 1. Booleans
    if pd.api.types.is_bool_dtype(series):
        return BOOLEAN, series
    if nunique <= 2 and set(series.dropna().unique()).issubset({0, 1, True, False, "0", "1", "Y", "N", "yes", "no"}):
        return BOOLEAN, series

    # 2. Numeric
    if pd.api.types.is_numeric_dtype(series):
        # An integer column that is almost entirely unique and named like a key is an identifier.
        looks_like_id = _name_hits(name, _ID_NAME_HINTS) and unique_ratio > 0.9
        if looks_like_id:
            return IDENTIFIER, series
        return MEASURE, series

    # 3. Datetime (native or parseable strings)
    if pd.api.types.is_datetime64_any_dtype(series):
        return TEMPORAL, series
    if _name_hits(name, _DATE_NAME_HINTS) or series.dtype == object:
        coerced = _try_parse_datetime(series)
        if coerced is not None:
            return TEMPORAL, coerced

    # 4. Object/string → geo / dimension / identifier / text
    if _name_hits(name, _GEO_NAME_HINTS):
        return GEO, series

    if unique_ratio > 0.9 and nunique > 50:
        # Almost every row distinct → an identifier or free text.
        avg_len = series.dropna().astype(str).str.len().mean()
        return (TEXT if avg_len and avg_len > 30 else IDENTIFIER), series

    avg_len = series.dropna().astype(str).str.len().mean() or 0
    if avg_len > 50 and nunique > 20:
        return TEXT, series

    # Low/medium cardinality string → a dimension you can group by.
    if nunique <= max(50, 0.5 * n_rows):
        return DIMENSION, series

    return TEXT, series


def _numeric_stats(series: pd.Series) -> dict[str, Any]:
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return {}
    q1, q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    outliers = int(((s < lower) | (s > upper)).sum())
    return {
        "min": float(s.min()),
        "max": float(s.max()),
        "mean": float(s.mean()),
        "median": float(s.median()),
        "std": float(s.std()) if len(s) > 1 else 0.0,
        "p25": q1,
        "p75": q3,
        "skew": float(s.skew()) if len(s) > 2 else 0.0,
        "outlier_count": outliers,
    }


def _top_values(series: pd.Series, k: int = 10) -> list[dict[str, Any]]:
    vc = series.dropna().astype(str).value_counts().head(k)
    return [{"value": idx, "count": int(cnt)} for idx, cnt in vc.items()]


def profile_dataframe(df: pd.DataFrame) -> DatasetProfile:
    """Profile a DataFrame into a DatasetProfile the recommender can consume."""
    n_rows = len(df)
    columns: list[ColumnProfile] = []
    buckets: dict[str, list[str]] = {
        MEASURE: [], DIMENSION: [], TEMPORAL: [],
        IDENTIFIER: [], BOOLEAN: [], TEXT: [], GEO: [],
    }

    for name in df.columns:
        series = df[name]
        sem_type, coerced = _infer_semantic_type(str(name), series, n_rows)
        # Write the coerced (e.g. parsed datetime) series back so downstream agg uses it.
        df[name] = coerced
        series = coerced

        missing = int(series.isna().sum())
        nunique = int(series.nunique(dropna=True))

        prof = ColumnProfile(
            name=str(name),
            dtype=str(series.dtype),
            semantic_type=sem_type,
            missing_count=missing,
            missing_pct=round(missing / max(n_rows, 1) * 100, 2),
            unique_count=nunique,
            unique_pct=round(nunique / max(n_rows, 1) * 100, 2),
            sample_values=[str(v) for v in series.dropna().head(3).tolist()],
        )

        if sem_type == MEASURE:
            for k, v in _numeric_stats(series).items():
                setattr(prof, k, v)
        elif sem_type in (DIMENSION, GEO, BOOLEAN):
            prof.top_values = _top_values(series)
        elif sem_type == TEMPORAL:
            dt = pd.to_datetime(series, errors="coerce").dropna()
            if not dt.empty:
                prof.min_date = dt.min().isoformat()
                prof.max_date = dt.max().isoformat()
                prof.range_days = int((dt.max() - dt.min()).days)
        elif sem_type == TEXT:
            prof.avg_length = round(float(series.dropna().astype(str).str.len().mean() or 0), 1)

        columns.append(prof)
        buckets[sem_type].append(str(name))

    return DatasetProfile(
        row_count=n_rows,
        column_count=len(df.columns),
        memory_kb=round(df.memory_usage(deep=True).sum() / 1024, 1),
        columns=columns,
        measures=buckets[MEASURE],
        dimensions=buckets[DIMENSION] + buckets[GEO],
        temporals=buckets[TEMPORAL],
        identifiers=buckets[IDENTIFIER],
        booleans=buckets[BOOLEAN],
        texts=buckets[TEXT],
        geos=buckets[GEO],
    )
