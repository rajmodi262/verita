"""
Dashboard Router — the Auto-Dashboard Studio endpoint.

POST /api/dashboard/generate
    Accept a CSV/Excel upload, profile it, and return a ready-to-render dashboard:
    column profiles + a ranked list of chart specs with pre-aggregated data.
"""

from __future__ import annotations

import io
import logging

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from ..config import MAX_UPLOAD_BYTES, MAX_PROFILE_ROWS
from ..profiling import profile_dataframe, recommend_dashboard

logger = logging.getLogger("verita.dashboard")
router = APIRouter()


def _read_upload(filename: str, raw: bytes) -> pd.DataFrame:
    """Parse an uploaded CSV/Excel file into a DataFrame."""
    name = (filename or "").lower()
    try:
        if name.endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(raw))
        if name.endswith((".csv", ".txt", ".tsv")):
            sep = "\t" if name.endswith(".tsv") else None  # let pandas sniff csv separators
            return pd.read_csv(io.BytesIO(raw), sep=sep, engine="python")
        # Fall back to CSV parsing for unknown extensions.
        return pd.read_csv(io.BytesIO(raw), engine="python")
    except Exception as e:  # noqa: BLE001 — surface a clean 400 to the client
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")


@router.post("/generate")
async def generate_dashboard(file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large (max {MAX_UPLOAD_BYTES // (1024*1024)}MB)",
        )

    df = _read_upload(file.filename or "upload.csv", raw)
    if df.empty or df.shape[1] == 0:
        raise HTTPException(status_code=400, detail="No tabular data found in file")

    # Sample very large files so profiling stays responsive for the demo.
    sampled = False
    if len(df) > MAX_PROFILE_ROWS:
        df = df.sample(MAX_PROFILE_ROWS, random_state=42).reset_index(drop=True)
        sampled = True

    profile = profile_dataframe(df)
    dashboard = recommend_dashboard(df, profile)

    from ..profiling.insights import generate_insights
    from ..profiling.relations import build_relationship_graph
    from ..profiling import store

    intel = generate_insights(df, profile)
    relationships = build_relationship_graph(df, profile)
    # Cache the profile alongside the data so downstream endpoints never re-profile.
    dataset_id = store.put(df, file.filename or "upload.csv", profile=profile)

    # Optionally polish the executive summary with an LLM (grounded on computed facts only).
    from ..genai import provider as genai

    enhanced = genai.enhance_summary(
        {
            "rows": profile.row_count, "columns": profile.column_count,
            "quality_score": intel["quality"]["score"], "grade": intel["quality"]["grade"],
            "measures": profile.measures, "dimensions": profile.dimensions, "temporals": profile.temporals,
            "key_findings": [i["text"] for i in intel["insights"][:4]],
        },
        intel["executive_summary"],
    )

    logger.info(
        "Generated dashboard for %s: %d rows, %d cols, %d charts, %d insights",
        file.filename, profile.row_count, profile.column_count, len(dashboard), len(intel["insights"]),
    )

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "title": _smart_title(file.filename or "Untitled dataset"),
        "sampled": sampled,
        "profile": profile.to_dict(),
        "dashboard": dashboard,
        "insights": intel["insights"],
        "quality": intel["quality"],
        "executive_summary": enhanced["summary"],
        "genai_mode": enhanced["mode"],
        "relationships": relationships,
    }


from pydantic import BaseModel, Field


def _require_dataset(dataset_id: str):
    """Return (df, profile) for a dataset id, reusing the cached profile. 404 if unknown."""
    from ..profiling import store

    df = store.get(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found — upload a file first")
    profile = store.get_profile(dataset_id)
    if profile is None:  # rehydrated without a profile (shouldn't happen) — recompute once
        profile = profile_dataframe(df.copy())
    return df, profile


def _primary_measure(profile) -> str:
    return next(
        (m for m in profile.measures if any(h in m.lower() for h in ("amount", "value", "revenue", "cost", "volume", "total"))),
        profile.measures[0],
    )


class ForecastRequest(BaseModel):
    dataset_id: str
    periods: int = Field(default=14, ge=3, le=60)


@router.post("/forecast")
def forecast(req: ForecastRequest):
    """Forecast the dataset's primary measure over its primary time column (honest backtest included)."""
    from ..profiling.forecast import forecast_series

    df, prof = _require_dataset(req.dataset_id)
    if not prof.temporals or not prof.measures:
        raise HTTPException(status_code=400, detail="Forecast needs a temporal column and a numeric measure")
    result = forecast_series(df, prof.temporals[0], _primary_measure(prof), req.periods)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


class CompareRequest(BaseModel):
    dataset_id: str


@router.post("/compare")
def compare_periods(req: CompareRequest):
    """'What changed?' — first half vs second half of the time range, with per-dimension deltas."""
    df, prof = _require_dataset(req.dataset_id)
    if not prof.temporals or not prof.measures:
        raise HTTPException(status_code=400, detail="Comparison needs a temporal column and a numeric measure")

    tcol = prof.temporals[0]
    measure = _primary_measure(prof)
    s = df.copy()
    s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
    s[measure] = pd.to_numeric(s[measure], errors="coerce")
    s = s.dropna(subset=[tcol, measure]).sort_values(tcol)
    if len(s) < 40:
        raise HTTPException(status_code=400, detail="Not enough rows to compare periods")

    mid = s[tcol].iloc[len(s) // 2]
    a, b = s[s[tcol] < mid], s[s[tcol] >= mid]

    def _pct(new: float, old: float) -> float | None:
        return round((new - old) / abs(old) * 100, 1) if abs(old) > 1e-9 else None

    headline = {
        "period_a": {"from": str(a[tcol].min().date()), "to": str(a[tcol].max().date()), "rows": int(len(a))},
        "period_b": {"from": str(b[tcol].min().date()), "to": str(b[tcol].max().date()), "rows": int(len(b))},
        "volume_change_pct": _pct(len(b), len(a)),
        "total_change_pct": _pct(float(b[measure].sum()), float(a[measure].sum())),
        "mean_change_pct": _pct(float(b[measure].mean()), float(a[measure].mean())),
        "measure": measure,
    }

    movers = []
    for dim in prof.dimensions[:3]:
        ga, gb = a.groupby(dim)[measure].sum(), b.groupby(dim)[measure].sum()
        for cat in set(ga.index) | set(gb.index):
            va, vb = float(ga.get(cat, 0.0)), float(gb.get(cat, 0.0))
            if max(va, vb) < float(s[measure].sum()) * 0.01:
                continue  # ignore tiny categories
            change = _pct(vb, va)
            if change is not None and abs(change) >= 15:
                movers.append({"dimension": dim, "category": str(cat), "before": round(va, 2), "after": round(vb, 2), "change_pct": change})
    movers.sort(key=lambda m: -abs(m["change_pct"]))

    return {"headline": headline, "movers": movers[:8]}


class FramesRequest(BaseModel):
    dataset_id: str


@router.post("/frames")
def time_frames(req: FramesRequest):
    """Time Machine — per-month aggregates so the UI can animate the dashboard through time."""
    df, prof = _require_dataset(req.dataset_id)
    if not prof.temporals or not prof.measures:
        raise HTTPException(status_code=400, detail="Time frames need a temporal column and a numeric measure")

    tcol = prof.temporals[0]
    measure = _primary_measure(prof)
    dim = prof.dimensions[0] if prof.dimensions else None

    s = df.copy()
    s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
    s[measure] = pd.to_numeric(s[measure], errors="coerce")
    s = s.dropna(subset=[tcol, measure])
    s["__period"] = s[tcol].dt.to_period("M").astype(str)

    frames = []
    for period, g in s.groupby("__period"):
        frame: dict = {
            "period": period,
            "rows": int(len(g)),
            "total": round(float(g[measure].sum()), 2),
            "mean": round(float(g[measure].mean()), 2),
        }
        if dim:
            top = g.groupby(dim)[measure].sum().sort_values(ascending=False).head(8)
            frame["by_dimension"] = {"dimension": dim, "data": [{"label": str(k), "value": round(float(v), 2)} for k, v in top.items()]}
        frames.append(frame)
    frames.sort(key=lambda f: f["period"])
    return {"measure": measure, "time_col": tcol, "frames": frames}


def _smart_title(filename: str) -> str:
    """'q3_financial-analysis.v2 (1).xlsx' → 'Q3 Financial Analysis'."""
    import re

    name = filename.rsplit(".", 1)[0]
    name = re.sub(r"\(\d+\)$", "", name)             # trailing copy markers
    name = re.sub(r"[_\-.]+", " ", name)              # separators → spaces
    name = re.sub(r"\bv?\d{1,2}\b$", "", name.strip())  # trailing version tokens
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        return "Untitled dataset"
    small = {"of", "and", "the", "for", "by", "in", "on", "to", "a", "an"}
    words = [
        w.upper() if (len(w) <= 3 and (w.isupper() or re.fullmatch(r"q\d", w, re.I))) else
        (w if w.lower() in small and i > 0 else w.capitalize())
        for i, w in enumerate(name.split())
    ]
    return " ".join(words)
