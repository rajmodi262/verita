"""Compliance NLP service."""

from __future__ import annotations

import logging
from typing import Any

from ..nlp.analyzer import analyze
from .exceptions import TextAnalysisError

logger = logging.getLogger("verita.services.nlp")


def analyze_text(text: str) -> dict[str, Any]:
    try:
        return analyze(text)
    except Exception as exc:  # noqa: BLE001 - normalize analyzer failures
        logger.exception("NLP analysis failed")
        raise TextAnalysisError(f"Analysis error: {exc}") from exc
