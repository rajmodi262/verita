"""
NLP Router — compliance text analysis.

POST /api/nlp/analyze   { "text": "..." }  → entities, regulatory matches, risk, recommended action
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..nlp.analyzer import analyze

logger = logging.getLogger("verita.nlp")
router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


@router.post("/analyze")
def analyze_text(req: AnalyzeRequest):
    try:
        return analyze(req.text)
    except Exception as e:
        logger.exception("NLP analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}")
