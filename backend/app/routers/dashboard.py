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
    dataset_id = store.put(df, file.filename or "upload.csv")

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
        "executive_summary": intel["executive_summary"],
        "relationships": relationships,
    }


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
