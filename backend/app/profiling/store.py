"""
Verita — in-memory dataset store.

Keeps a small LRU cache of uploaded DataFrames keyed by a dataset_id, so downstream features
(SQL playground, cross-filtering) can operate on the data without re-uploading. Bounded so memory
can't grow without limit.
"""

from __future__ import annotations

import uuid
from collections import OrderedDict

import pandas as pd

_MAX_DATASETS = 12
_store: "OrderedDict[str, dict]" = OrderedDict()


def put(df: pd.DataFrame, filename: str) -> str:
    dataset_id = uuid.uuid4().hex[:12]
    _store[dataset_id] = {"df": df, "filename": filename}
    _store.move_to_end(dataset_id)
    while len(_store) > _MAX_DATASETS:
        _store.popitem(last=False)  # evict least-recently-used
    return dataset_id


def get(dataset_id: str) -> pd.DataFrame | None:
    entry = _store.get(dataset_id)
    if entry is None:
        return None
    _store.move_to_end(dataset_id)
    return entry["df"]


def get_filename(dataset_id: str) -> str | None:
    entry = _store.get(dataset_id)
    return entry["filename"] if entry else None
