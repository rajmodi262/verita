"""Auditable compliance investigator service."""

from __future__ import annotations

import logging
from typing import Any

from ..audit import record_investigation
from ..agent.investigator import investigate as run_investigator
from .datasets import dataset_title, require_dataset
from .exceptions import InvestigationError

logger = logging.getLogger("verita.services.agent")


def investigate_dataset(dataset_id: str) -> dict[str, Any]:
    """Run deterministic AML/fraud hypotheses and persist the chain summary."""
    df, profile = require_dataset(dataset_id)
    title = dataset_title(dataset_id)

    try:
        result = run_investigator(df, profile, title=title)
    except Exception as exc:  # noqa: BLE001 - normalize investigation failures
        logger.exception("investigation failed")
        raise InvestigationError(f"Investigation error: {exc}") from exc

    record_investigation(
        dataset_id=dataset_id,
        goal="AML/fraud screening",
        risk_level=result["risk_level"],
        finding_count=result["confirmed_count"],
        chain_head=result["chain"]["head"],
        memo_mode=result["memo_mode"],
    )
    return result
