"""
NLP Router — compliance text analysis.

POST /api/nlp/analyze   { "text": "..." }  → entities, regulatory matches, risk, recommended action
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..nlp.analyzer import analyze

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)


@router.post("/analyze")
def analyze_text(req: AnalyzeRequest):
    return analyze(req.text)
