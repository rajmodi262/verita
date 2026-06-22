"""Dashboard service layer.

This module owns the Auto-Dashboard Studio orchestration: upload parsing,
profiling, recommendation, insights, forecasting, period comparison, and time
frames. The router stays responsible for HTTP transport only.
"""

from __future__ import annotations

import io
import logging
from typing import Any

import pandas as pd

from ..audit import record_analysis
from ..config import MAX_PROFILE_ROWS, MAX_UPLOAD_BYTES
from ..genai import provider as genai
from ..profiling import profile_dataframe, recommend_dashboard, store
from ..profiling.forecast import forecast_series
from ..profiling.insights import generate_insights
from ..profiling.relations import build_relationship_graph
from .datasets import primary_measure, require_dataset, smart_title
from .exceptions import InvalidDataset, UploadError

logger = logging.getLogger("verita.services.dashboard")


def _read_upload(filename: str, raw: bytes) -> pd.DataFrame:
    """Parse an uploaded CSV/Excel file into a DataFrame."""
    name = (filename or "").lower()
    try:
        if name.endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(raw))
        if name.endswith((".csv", ".txt", ".tsv")):
            sep = "\t" if name.endswith(".tsv") else None
            return pd.read_csv(io.BytesIO(raw), sep=sep, engine="python")
        return pd.read_csv(io.BytesIO(raw), engine="python")
    except Exception as exc:  # noqa: BLE001 - surface a clean service error
        raise UploadError(f"Could not parse file: {exc}") from exc


def generate_dashboard(filename: str, raw: bytes) -> dict[str, Any]:
    """Profile an uploaded table and return a complete dashboard payload."""
    if not raw:
        raise UploadError("Uploaded file is empty")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise UploadError(f"File too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)}MB)")

    df = _read_upload(filename, raw)
    if df.empty or df.shape[1] == 0:
        raise InvalidDataset("No tabular data found in file")

    sampled = False
    if len(df) > MAX_PROFILE_ROWS:
        df = df.sample(MAX_PROFILE_ROWS, random_state=42).reset_index(drop=True)
        sampled = True

    profile = profile_dataframe(df)
    dashboard = recommend_dashboard(df, profile)
    intel = generate_insights(df, profile)
    relationships = build_relationship_graph(df, profile)
    dataset_id = store.put(df, filename or "upload.csv", profile=profile)

    enhanced = genai.enhance_summary(
        {
            "rows": profile.row_count,
            "columns": profile.column_count,
            "quality_score": intel["quality"]["score"],
            "grade": intel["quality"]["grade"],
            "measures": profile.measures,
            "dimensions": profile.dimensions,
            "temporals": profile.temporals,
            "key_findings": [i["text"] for i in intel["insights"][:4]],
        },
        intel["executive_summary"],
    )

    title = smart_title(filename or "Untitled dataset")
    record_analysis(
        dataset_id=dataset_id,
        filename=filename or "upload.csv",
        title=title,
        row_count=profile.row_count,
        column_count=profile.column_count,
        quality_score=intel["quality"]["score"],
        quality_grade=intel["quality"]["grade"],
        insights_count=len(intel["insights"]),
    )

    logger.info(
        "Generated dashboard for %s: %d rows, %d cols, %d charts, %d insights",
        filename,
        profile.row_count,
        profile.column_count,
        len(dashboard),
        len(intel["insights"]),
    )

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "title": title,
        "sampled": sampled,
        "profile": profile.to_dict(),
        "dashboard": dashboard,
        "insights": intel["insights"],
        "quality": intel["quality"],
        "executive_summary": enhanced["summary"],
        "genai_mode": enhanced["mode"],
        "relationships": relationships,
    }


def forecast_dataset(dataset_id: str, periods: int) -> dict[str, Any]:
    """Forecast the primary measure over the primary time column."""
    df, prof = require_dataset(dataset_id)
    if not prof.temporals or not prof.measures:
        raise InvalidDataset("Forecast needs a temporal column and a numeric measure")

    result = forecast_series(df, prof.temporals[0], primary_measure(prof), periods)
    if "error" in result:
        raise InvalidDataset(result["error"])
    return result


def compare_periods(dataset_id: str) -> dict[str, Any]:
    """Compare first half vs. second half of the time range."""
    df, prof = require_dataset(dataset_id)
    if not prof.temporals or not prof.measures:
        raise InvalidDataset("Comparison needs a temporal column and a numeric measure")

    tcol = prof.temporals[0]
    measure = primary_measure(prof)
    s = df.copy()
    s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
    s[measure] = pd.to_numeric(s[measure], errors="coerce")
    s = s.dropna(subset=[tcol, measure]).sort_values(tcol)
    if len(s) < 40:
        raise InvalidDataset("Not enough rows to compare periods")

    mid = s[tcol].iloc[len(s) // 2]
    a, b = s[s[tcol] < mid], s[s[tcol] >= mid]

    def pct(new: float, old: float) -> float | None:
        return round((new - old) / abs(old) * 100, 1) if abs(old) > 1e-9 else None

    headline = {
        "period_a": {
            "from": str(a[tcol].min().date()),
            "to": str(a[tcol].max().date()),
            "rows": int(len(a)),
        },
        "period_b": {
            "from": str(b[tcol].min().date()),
            "to": str(b[tcol].max().date()),
            "rows": int(len(b)),
        },
        "volume_change_pct": pct(len(b), len(a)),
        "total_change_pct": pct(float(b[measure].sum()), float(a[measure].sum())),
        "mean_change_pct": pct(float(b[measure].mean()), float(a[measure].mean())),
        "measure": measure,
    }

    movers = []
    for dim in prof.dimensions[:3]:
        ga, gb = a.groupby(dim)[measure].sum(), b.groupby(dim)[measure].sum()
        for cat in set(ga.index) | set(gb.index):
            va, vb = float(ga.get(cat, 0.0)), float(gb.get(cat, 0.0))
            if max(va, vb) < float(s[measure].sum()) * 0.01:
                continue
            change = pct(vb, va)
            if change is not None and abs(change) >= 15:
                movers.append(
                    {
                        "dimension": dim,
                        "category": str(cat),
                        "before": round(va, 2),
                        "after": round(vb, 2),
                        "change_pct": change,
                    }
                )
    movers.sort(key=lambda m: -abs(m["change_pct"]))

    return {"headline": headline, "movers": movers[:8]}


def time_frames(dataset_id: str) -> dict[str, Any]:
    """Build per-month aggregates for the Time Machine UI."""
    df, prof = require_dataset(dataset_id)
    if not prof.temporals or not prof.measures:
        raise InvalidDataset("Time frames need a temporal column and a numeric measure")

    tcol = prof.temporals[0]
    measure = primary_measure(prof)
    dim = prof.dimensions[0] if prof.dimensions else None

    s = df.copy()
    s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
    s[measure] = pd.to_numeric(s[measure], errors="coerce")
    s = s.dropna(subset=[tcol, measure])
    s["__period"] = s[tcol].dt.to_period("M").astype(str)

    frames = []
    for period, g in s.groupby("__period"):
        frame: dict[str, Any] = {
            "period": period,
            "rows": int(len(g)),
            "total": round(float(g[measure].sum()), 2),
            "mean": round(float(g[measure].mean()), 2),
        }
        if dim:
            top = g.groupby(dim)[measure].sum().sort_values(ascending=False).head(8)
            frame["by_dimension"] = {
                "dimension": dim,
                "data": [
                    {"label": str(k), "value": round(float(v), 2)}
                    for k, v in top.items()
                ],
            }
        frames.append(frame)
    frames.sort(key=lambda f: f["period"])
    return {"measure": measure, "time_col": tcol, "frames": frames}
