"""
Agent Router — the Auditable Compliance Investigator.

POST /api/agent/investigate  {dataset_id}  → autonomous investigation with a hash-chained,
                                              reproducible reasoning trace + compliance memo.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..profiling import store
from ..profiling.profiler import profile_dataframe

logger = logging.getLogger("verita.agent")
router = APIRouter()


class InvestigateRequest(BaseModel):
    dataset_id: str


@router.post("/investigate")
def investigate(req: InvestigateRequest):
    df = store.get(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found — upload a file first")
    profile = store.get_profile(req.dataset_id) or profile_dataframe(df.copy())
    title = (store.get_filename(req.dataset_id) or "Dataset").rsplit(".", 1)[0]

    try:
        from ..agent.investigator import investigate as run

        result = run(df, profile, title=title)
    except Exception as e:
        logger.exception("investigation failed")
        raise HTTPException(status_code=500, detail=f"Investigation error: {e}")

    # Audit: persist the investigation summary + chain head (best-effort).
    from ..audit import record_investigation

    record_investigation(
        dataset_id=req.dataset_id, goal="AML/fraud screening",
        risk_level=result["risk_level"], finding_count=result["confirmed_count"],
        chain_head=result["chain"]["head"], memo_mode=result["memo_mode"],
    )
    return result
