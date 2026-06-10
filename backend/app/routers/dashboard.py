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

    logger.info(
        "Generated dashboard for %s: %d rows, %d cols, %d charts",
        file.filename, profile.row_count, profile.column_count, len(dashboard),
    )

    return {
        "filename": file.filename,
        "sampled": sampled,
        "profile": profile.to_dict(),
        "dashboard": dashboard,
    }
