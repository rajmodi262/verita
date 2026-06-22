"""Dataset service helpers shared by routers and domain services."""

from __future__ import annotations

import re
from typing import Any

import pandas as pd

from ..profiling import store
from ..profiling.profiler import profile_dataframe
from .exceptions import DatasetNotFound, InvalidDataset


def require_dataset(dataset_id: str) -> tuple[pd.DataFrame, Any]:
    """Return a stored DataFrame and cached profile, or raise a service error."""
    df = store.get(dataset_id)
    if df is None:
        raise DatasetNotFound("Dataset not found - upload a file first")
    profile = store.get_profile(dataset_id)
    if profile is None:
        profile = profile_dataframe(df.copy())
    return df, profile


def dataset_title(dataset_id: str, fallback: str = "Dataset") -> str:
    """Return a display title for a stored dataset id."""
    return (store.get_filename(dataset_id) or fallback).rsplit(".", 1)[0]


def primary_measure(profile: Any) -> str:
    """Choose the most business-relevant numeric measure from a profile."""
    if not getattr(profile, "measures", None):
        raise InvalidDataset("A numeric measure is required")
    return next(
        (
            m
            for m in profile.measures
            if any(
                hint in m.lower()
                for hint in ("amount", "value", "revenue", "cost", "volume", "total")
            )
        ),
        profile.measures[0],
    )


def smart_title(filename: str) -> str:
    """Convert an uploaded filename into a stakeholder-friendly dataset title."""
    name = filename.rsplit(".", 1)[0]
    name = re.sub(r"\(\d+\)$", "", name)
    name = re.sub(r"[_\-.]+", " ", name)
    name = re.sub(r"\bv?\d{1,2}\b$", "", name.strip())
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        return "Untitled dataset"

    small = {"of", "and", "the", "for", "by", "in", "on", "to", "a", "an"}
    words = [
        w.upper()
        if (len(w) <= 3 and (w.isupper() or re.fullmatch(r"q\d", w, re.I)))
        else (w if w.lower() in small and i > 0 else w.capitalize())
        for i, w in enumerate(name.split())
    ]
    return " ".join(words)
