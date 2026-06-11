"""
Verita — Relationship Map builder.

Builds a node/edge graph of how columns relate:
  • measure ↔ measure edges weighted by |Pearson r|
  • dimension → measure edges weighted by eta-squared (variance explained by the grouping),
    so categorical influence shows up too — not just numeric correlation.

The frontend renders this as an interactive force graph.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .profiler import DatasetProfile


def _eta_squared(df: pd.DataFrame, dim: str, measure: str) -> float:
    """Variance in `measure` explained by grouping on `dim` (0..1)."""
    s = pd.to_numeric(df[measure], errors="coerce")
    groups = df[dim]
    valid = s.notna() & groups.notna()
    s, groups = s[valid], groups[valid]
    if len(s) < 30 or groups.nunique() < 2:
        return 0.0
    grand = s.mean()
    ss_total = ((s - grand) ** 2).sum()
    if ss_total == 0:
        return 0.0
    ss_between = sum(len(g) * (g.mean() - grand) ** 2 for _, g in s.groupby(groups))
    return float(ss_between / ss_total)


def build_relationship_graph(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    measures = profile.measures[:8]
    dims = profile.dimensions[:6]

    for m in measures:
        nodes.append({"id": m, "type": "measure"})
    for d in dims:
        nodes.append({"id": d, "type": "dimension"})
    if profile.temporals:
        nodes.append({"id": profile.temporals[0], "type": "temporal"})

    # measure ↔ measure (Pearson)
    if len(measures) >= 2:
        num = df[measures].apply(pd.to_numeric, errors="coerce")
        corr = num.corr()
        for i, a in enumerate(measures):
            for b in measures[i + 1:]:
                r = corr.loc[a, b]
                if pd.notna(r) and abs(r) >= 0.25:
                    edges.append({
                        "source": a, "target": b,
                        "weight": round(abs(float(r)), 3),
                        "sign": "positive" if r > 0 else "negative",
                        "kind": "pearson", "label": f"r = {r:.2f}",
                    })

    # dimension → measure (eta²)
    for d in dims:
        for m in measures[:4]:
            try:
                eta = _eta_squared(df, d, m)
            except Exception:
                eta = 0.0
            if eta >= 0.05:
                edges.append({
                    "source": d, "target": m,
                    "weight": round(eta, 3), "sign": "explains",
                    "kind": "eta_squared", "label": f"η² = {eta:.2f}",
                })

    # prune isolated nodes so the graph stays clean
    connected = {e["source"] for e in edges} | {e["target"] for e in edges}
    nodes = [n for n in nodes if n["id"] in connected]

    return {"nodes": nodes, "edges": edges}
