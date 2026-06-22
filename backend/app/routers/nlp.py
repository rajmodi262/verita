"""
NLP Router - compliance text analysis.

HTTP adapter only:
POST /api/nlp/analyze
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.exceptions import TextAnalysisError
from ..services.nlp_service import analyze_text as svc_analyze_text

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


@router.post("/analyze")
def analyze_text(req: AnalyzeRequest):
    try:
        return svc_analyze_text(req.text)
    except TextAnalysisError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
