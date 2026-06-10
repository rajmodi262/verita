"""
Verita — Dashboard Recommendation Engine

Turns a DatasetProfile into a ranked list of chart specifications, each with its data
pre-aggregated server-side (Pandas) so the frontend only has to render. This is the logic
that lets a layman "get Power BI for free": Verita decides what's worth showing.

Each chart spec is a self-contained dict the ECharts frontend can render directly.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .profiler import DatasetProfile

# Charts are emitted in priority order; the frontend lays them out top-to-bottom / left-to-right.
KPI = "kpi"
LINE = "line"
BAR = "bar"
PIE = "pie"
HISTOGRAM = "histogram"
HEATMAP = "heatmap"

_TOP_N = 12            # max categories shown in a categorical breakdown
_MAX_CHARTS = 14       # keep the auto-dashboard focused, not a wall of noise


def _fmt_num(x: float) -> str:
    if abs(x) >= 1_000_000_000:
        return f"{x/1_000_000_000:.2f}B"
    if abs(x) >= 1_000_000:
        return f"{x/1_000_000:.2f}M"
    if abs(x) >= 1_000:
        return f"{x/1_000:.1f}K"
    return f"{x:,.0f}" if float(x).is_integer() else f"{x:,.2f}"


def _primary_measure(profile: DatasetProfile) -> str | None:
    """Pick the most 'dashboard-worthy' measure: prefer money-like names, then highest variance."""
    if not profile.measures:
        return None
    money_like = [m for m in profile.measures
                  if any(h in m.lower() for h in ("amount", "value", "revenue", "cost", "price", "volume", "total"))]
    return (money_like or profile.measures)[0]


def _kpi_cards(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = [{
        "id": "kpi_rows", "chart_type": KPI, "priority": 0,
        "title": "Total Records", "value": _fmt_num(profile.row_count), "raw": profile.row_count,
    }]
    pm = _primary_measure(profile)
    if pm:
        s = pd.to_numeric(df[pm], errors="coerce").dropna()
        if not s.empty:
            cards.append({"id": f"kpi_sum_{pm}", "chart_type": KPI, "priority": 1,
                          "title": f"Total {pm}", "value": _fmt_num(float(s.sum())), "raw": float(s.sum())})
            cards.append({"id": f"kpi_avg_{pm}", "chart_type": KPI, "priority": 2,
                          "title": f"Avg {pm}", "value": _fmt_num(float(s.mean())), "raw": float(s.mean())})
    # A boolean flag (e.g. is_fraud / is_anomaly) makes a great rate KPI — very FCC-relevant.
    for b in profile.booleans[:1]:
        flag = df[b].astype(str).str.lower().isin(["1", "true", "yes", "y"])
        rate = float(flag.mean() * 100)
        cards.append({"id": f"kpi_rate_{b}", "chart_type": KPI, "priority": 1,
                      "title": f"{b} rate", "value": f"{rate:.2f}%", "raw": rate, "accent": "danger"})
    return cards


def _time_series(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    pm = _primary_measure(profile)
    if not profile.temporals or not pm:
        return []
    tcol = profile.temporals[0]
    s = df[[tcol, pm]].copy()
    s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
    s[pm] = pd.to_numeric(s[pm], errors="coerce")
    s = s.dropna()
    if s.empty:
        return []
    span_days = (s[tcol].max() - s[tcol].min()).days
    freq = "D" if span_days <= 90 else "W" if span_days <= 730 else "M"
    grouped = s.set_index(tcol)[pm].resample(freq).sum()
    return [{
        "id": f"ts_{pm}", "chart_type": LINE, "priority": 3,
        "title": f"{pm} over time", "x_label": tcol, "y_label": pm,
        "data": [{"x": idx.isoformat(), "y": round(float(v), 2)} for idx, v in grouped.items()],
    }]


def _categorical_breakdowns(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    charts: list[dict[str, Any]] = []
    pm = _primary_measure(profile)
    prio = 4
    for dim in profile.dimensions[:4]:
        if pm:
            grp = df.groupby(dim)[pm].apply(lambda x: pd.to_numeric(x, errors="coerce").sum())
            grp = grp.sort_values(ascending=False).head(_TOP_N)
            measure_label, agg = pm, "sum"
        else:
            grp = df[dim].value_counts().head(_TOP_N)
            measure_label, agg = "count", "count"
        if grp.empty:
            continue
        ctype = PIE if grp.shape[0] <= 6 else BAR
        charts.append({
            "id": f"cat_{dim}", "chart_type": ctype, "priority": prio,
            "title": f"{measure_label} by {dim}", "dimension": dim, "measure": measure_label, "agg": agg,
            "data": [{"label": str(k), "value": round(float(v), 2)} for k, v in grp.items()],
        })
        prio += 1
    return charts


def _distributions(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    charts: list[dict[str, Any]] = []
    prio = 9
    for m in profile.measures[:2]:
        s = pd.to_numeric(df[m], errors="coerce").dropna()
        if s.empty or s.nunique() <= 1:
            continue
        counts, edges = np.histogram(s, bins=min(30, max(10, int(np.sqrt(len(s))))))
        charts.append({
            "id": f"hist_{m}", "chart_type": HISTOGRAM, "priority": prio,
            "title": f"Distribution of {m}", "measure": m,
            "data": [{"bin": round(float(edges[i]), 2), "count": int(counts[i])} for i in range(len(counts))],
        })
        prio += 1
    return charts


def _correlation(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    if len(profile.measures) < 3:
        return []
    num = df[profile.measures].apply(pd.to_numeric, errors="coerce")
    # Cap the matrix so a wide dataset doesn't produce an unreadable 100x100 grid.
    cols = profile.measures[:12]
    corr = num[cols].corr().round(3).fillna(0)
    cells = [{"x": cx, "y": cy, "value": float(corr.loc[cy, cx])} for cy in cols for cx in cols]
    return [{
        "id": "corr_heatmap", "chart_type": HEATMAP, "priority": 13,
        "title": "Correlation between measures", "labels": cols, "data": cells,
    }]


def recommend_dashboard(df: pd.DataFrame, profile: DatasetProfile) -> list[dict[str, Any]]:
    """Produce a ranked, render-ready dashboard for this dataset."""
    charts: list[dict[str, Any]] = []
    charts += _kpi_cards(df, profile)
    charts += _time_series(df, profile)
    charts += _categorical_breakdowns(df, profile)
    charts += _distributions(df, profile)
    charts += _correlation(df, profile)
    charts.sort(key=lambda c: c["priority"])
    return charts[:_MAX_CHARTS + 4]  # +4 leaves room for the KPI row, which is cheap
