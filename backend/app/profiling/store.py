"""
Verita — dataset store.

Two tiers:
  • memory: an LRU of recent DataFrames + their computed DatasetProfile (profiling is done
    once at upload; every downstream endpoint reuses the cached profile instead of
    re-profiling per request);
  • disk: each dataset is pickled to a cache directory so uploads survive a server restart —
    a `dataset_id` held by an open browser tab keeps working after a redeploy.

Both tiers are bounded (LRU in memory, oldest-file eviction on disk).
"""

from __future__ import annotations

import logging
import os
import pickle
import uuid
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any

import pandas as pd

logger = logging.getLogger("verita.store")

_MAX_MEMORY = 8
_MAX_DISK = 24
_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".verita_cache"))


@dataclass
class Entry:
    df: pd.DataFrame
    filename: str
    profile: Any  # DatasetProfile — kept as Any to avoid a circular import


_store: "OrderedDict[str, Entry]" = OrderedDict()


def _disk_path(dataset_id: str) -> str:
    return os.path.join(_CACHE_DIR, f"{dataset_id}.pkl")


def _evict_disk() -> None:
    try:
        files = sorted(
            (os.path.join(_CACHE_DIR, f) for f in os.listdir(_CACHE_DIR) if f.endswith(".pkl")),
            key=os.path.getmtime,
        )
        for path in files[:-_MAX_DISK]:
            os.remove(path)
    except OSError:
        pass


def put(df: pd.DataFrame, filename: str, profile: Any = None) -> str:
    dataset_id = uuid.uuid4().hex[:12]
    entry = Entry(df=df, filename=filename, profile=profile)
    _store[dataset_id] = entry
    _store.move_to_end(dataset_id)
    while len(_store) > _MAX_MEMORY:
        _store.popitem(last=False)

    # Persist to disk so the id survives a restart. Failure is non-fatal (memory still works).
    try:
        os.makedirs(_CACHE_DIR, exist_ok=True)
        with open(_disk_path(dataset_id), "wb") as f:
            pickle.dump(entry, f, protocol=pickle.HIGHEST_PROTOCOL)
        _evict_disk()
    except Exception as e:
        logger.warning("Could not persist dataset %s to disk: %s", dataset_id, e)

    return dataset_id


def _get_entry(dataset_id: str) -> Entry | None:
    entry = _store.get(dataset_id)
    if entry is not None:
        _store.move_to_end(dataset_id)
        return entry
    # Memory miss → try disk (restart survival).
    path = _disk_path(dataset_id)
    if os.path.exists(path):
        try:
            with open(path, "rb") as f:
                entry = pickle.load(f)
            _store[dataset_id] = entry
            while len(_store) > _MAX_MEMORY:
                _store.popitem(last=False)
            logger.info("Dataset %s rehydrated from disk cache", dataset_id)
            return entry
        except Exception as e:
            logger.warning("Failed to rehydrate dataset %s: %s", dataset_id, e)
    return None


def get(dataset_id: str) -> pd.DataFrame | None:
    entry = _get_entry(dataset_id)
    return entry.df if entry else None


def get_profile(dataset_id: str) -> Any | None:
    """Cached DatasetProfile (computed once at upload) — or None."""
    entry = _get_entry(dataset_id)
    return entry.profile if entry else None


def get_filename(dataset_id: str) -> str | None:
    entry = _get_entry(dataset_id)
    return entry.filename if entry else None


def clear() -> None:
    """Test helper — wipe memory tier (disk cache left alone)."""
    _store.clear()
