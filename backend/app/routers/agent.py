"""
Agent Router - the Auditable Compliance Investigator.

HTTP adapter only:
POST /api/agent/investigate
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.agent_service import investigate_dataset
from ..services.exceptions import DatasetNotFound, InvestigationError

logger = logging.getLogger("verita.agent")
router = APIRouter()


class InvestigateRequest(BaseModel):
    dataset_id: str


@router.post("/investigate")
def investigate(req: InvestigateRequest):
    try:
        return investigate_dataset(req.dataset_id)
    except DatasetNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvestigationError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
