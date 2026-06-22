"""
Dashboard Router - the Auto-Dashboard Studio endpoint.

HTTP adapter only:
POST /api/dashboard/generate
POST /api/dashboard/forecast
POST /api/dashboard/compare
POST /api/dashboard/frames
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from ..services.dashboard_service import (
    compare_periods as svc_compare_periods,
    forecast_dataset as svc_forecast_dataset,
    generate_dashboard as svc_generate_dashboard,
    time_frames as svc_time_frames,
)
from ..services.datasets import smart_title as _smart_title
from ..services.exceptions import DatasetNotFound, InvalidDataset, UploadError

logger = logging.getLogger("verita.dashboard")
router = APIRouter()


def _dataset_error(exc: DatasetNotFound) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


def _request_error(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


@router.post("/generate")
async def generate_dashboard(file: UploadFile = File(...)):
    raw = await file.read()
    filename = file.filename or "upload.csv"
    try:
        return await run_in_threadpool(svc_generate_dashboard, filename, raw)
    except (UploadError, InvalidDataset) as exc:
        raise _request_error(exc) from exc
    except Exception as exc:  # noqa: BLE001 - router returns a clean API error
        logger.exception("dashboard generation failed")
        raise HTTPException(status_code=500, detail=f"Dashboard generation error: {exc}") from exc


class ForecastRequest(BaseModel):
    dataset_id: str
    periods: int = Field(default=14, ge=3, le=60)


@router.post("/forecast")
def forecast(req: ForecastRequest):
    try:
        return svc_forecast_dataset(req.dataset_id, req.periods)
    except DatasetNotFound as exc:
        raise _dataset_error(exc) from exc
    except InvalidDataset as exc:
        raise _request_error(exc) from exc


class CompareRequest(BaseModel):
    dataset_id: str


@router.post("/compare")
def compare_periods(req: CompareRequest):
    try:
        return svc_compare_periods(req.dataset_id)
    except DatasetNotFound as exc:
        raise _dataset_error(exc) from exc
    except InvalidDataset as exc:
        raise _request_error(exc) from exc


class FramesRequest(BaseModel):
    dataset_id: str


@router.post("/frames")
def time_frames(req: FramesRequest):
    try:
        return svc_time_frames(req.dataset_id)
    except DatasetNotFound as exc:
        raise _dataset_error(exc) from exc
    except InvalidDataset as exc:
        raise _request_error(exc) from exc
