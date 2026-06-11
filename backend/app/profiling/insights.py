"""
Verita — Auto-Insights Engine.

Computes plain-English "Key Findings" from a profiled dataset. Every insight is a real
statistical measurement and carries `evidence` — the exact computation that produced it —
so the UI can offer "how was this computed?" for every claim. No templates without numbers,
no numbers without provenance.

Insight kinds: dominance, comparison (with significance test), trend, concentration,
skew, correlation, quality, executive summary.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

try:
    from scipy import stats as _scipy_stats
except ImportError:  # scipy is in requirements; degrade gracefully if absent
    _scipy_stats = None

from .profiler import DatasetProfile


def _fmt_money(x: float) -> str:
    if abs(x) >= 1_000_000_000:
        return f"${x/1_000_000_000:.2f}B"
    if abs(x) >= 1_000_000:
        return f"${x/1_000_000:.2f}M"
    if abs(x) >= 1_000:
        return f"${x/1_000:.1f}K"
    return f"${x:,.0f}"


def _is_money_like(name: str) -> bool:
    return any(h in name.lower() for h in ("amount", "value", "revenue", "cost", "price", "volume", "total"))


def _insight(kind: str, icon: str, severity: str, text: str, evidence: str) -> dict[str, Any]:
    return {"kind": kind, "icon": icon, "severity": severity, "text": text, "evidence": evidence}


# ── individual analyzers ─────────────────────────────────────────────────────

def _dominance(df: pd.DataFrame, profile: DatasetProfile, measure: str | None) -> list[dict]:
    """Which category dominates the primary measure?"""
    out = []
    for dim in profile.dimensions[:3]:
        try:
            if measure:
                grp = df.groupby(dim)[measure].apply(lambda s: pd.to_numeric(s, errors="coerce").sum()).sort_values(ascending=False)
                total = grp.sum()
                if total <= 0 or len(grp) < 2:
                    continue
                share = grp.iloc[0] / total
                if share >= 0.35:
                    out.append(_insight(
                        "dominance", "📊", "info",
                        f"{grp.index[0]} dominates {dim}: {share:.0%} of total {measure} ({_fmt_money(grp.iloc[0]) if _is_money_like(measure) else f'{grp.iloc[0]:,.0f}'}).",
                        f"df.groupby('{dim}')['{measure}'].sum() → top share {grp.iloc[0]:,.2f} / {total:,.2f} = {share:.3f}",
                    ))
            else:
                vc = df[dim].value_counts(normalize=True)
                if len(vc) >= 2 and vc.iloc[0] >= 0.45:
                    out.append(_insight(
                        "dominance", "📊", "info",
                        f"{vc.index[0]} accounts for {vc.iloc[0]:.0%} of all records by {dim}.",
                        f"df['{dim}'].value_counts(normalize=True).iloc[0] = {vc.iloc[0]:.3f}",
                    ))
        except Exception:
            continue
    return out


def _risk_concentration(df: pd.DataFrame, profile: DatasetProfile) -> list[dict]:
    """If a boolean flag (fraud/anomaly) exists: which segments over-index on it?"""
    out = []
    flags = [b for b in profile.booleans if any(h in b.lower() for h in ("fraud", "anomal", "flag", "suspic", "alert"))]
    if not flags:
        return out
    flag = flags[0]
    f = df[flag].astype(str).str.lower().isin(["1", "true", "yes", "y"])
    base = f.mean()
    if base == 0:
        return out
    for dim in profile.dimensions[:4]:
        try:
            rate = f.groupby(df[dim]).mean().sort_values(ascending=False)
            counts = df[dim].value_counts()
            top = rate.index[0]
            if counts.get(top, 0) >= 30 and rate.iloc[0] >= base * 1.5:
                out.append(_insight(
                    "risk", "🔺", "warning",
                    f"{top} ({dim}) shows a {flag} rate of {rate.iloc[0]:.1%} — {rate.iloc[0]/base:.1f}× the overall {base:.1%}.",
                    f"df.groupby('{dim}')['{flag}'].mean(): {top} = {rate.iloc[0]:.4f} vs overall {base:.4f} (n={counts[top]})",
                ))
        except Exception:
            continue
    return out[:2]


def _comparison_significance(df: pd.DataFrame, profile: DatasetProfile, measure: str | None) -> list[dict]:
    """Welch t-test between the two largest groups on the primary measure — real hypothesis testing."""
    if not measure or _scipy_stats is None or not profile.dimensions:
        return []
    dim = profile.dimensions[0]
    try:
        counts = df[dim].value_counts()
        if len(counts) < 2 or counts.iloc[1] < 30:
            return []
        g1, g2 = counts.index[0], counts.index[1]
        a = pd.to_numeric(df.loc[df[dim] == g1, measure], errors="coerce").dropna()
        b = pd.to_numeric(df.loc[df[dim] == g2, measure], errors="coerce").dropna()
        t, p = _scipy_stats.ttest_ind(a, b, equal_var=False)
        if p < 0.05:
            hi, lo = (g1, g2) if a.mean() > b.mean() else (g2, g1)
            hm, lm = max(a.mean(), b.mean()), min(a.mean(), b.mean())
            return [_insight(
                "comparison", "🧪", "info",
                f"{hi} {measure} is significantly higher than {lo} (mean {hm:,.0f} vs {lm:,.0f}; Welch t-test, p = {p:.3g}).",
                f"scipy.stats.ttest_ind(df[df['{dim}']=='{g1}']['{measure}'], df[df['{dim}']=='{g2}']['{measure}'], equal_var=False) → t={t:.2f}, p={p:.3g}",
            )]
    except Exception:
        pass
    return []


def _trend(df: pd.DataFrame, profile: DatasetProfile, measure: str | None) -> list[dict]:
    """Compare first vs last third of the time range on the primary measure."""
    if not profile.temporals or not measure:
        return []
    tcol = profile.temporals[0]
    try:
        s = df[[tcol, measure]].copy()
        s[tcol] = pd.to_datetime(s[tcol], errors="coerce")
        s[measure] = pd.to_numeric(s[measure], errors="coerce")
        s = s.dropna().sort_values(tcol)
        if len(s) < 60:
            return []
        third = len(s) // 3
        first, last = s.iloc[:third][measure].sum(), s.iloc[-third:][measure].sum()
        if first <= 0:
            return []
        change = (last - first) / first
        if abs(change) >= 0.15:
            arrow = "📈" if change > 0 else "📉"
            return [_insight(
                "trend", arrow, "info",
                f"{measure} {'grew' if change > 0 else 'declined'} {abs(change):.0%} between the start and end of the period.",
                f"sum of last third ({last:,.0f}) vs first third ({first:,.0f}) ordered by '{tcol}' → Δ {change:+.3f}",
            )]
    except Exception:
        pass
    return []


def _skew_outliers(df: pd.DataFrame, profile: DatasetProfile) -> list[dict]:
    out = []
    for col in profile.columns:
        if col.semantic_type != "measure" or col.skew is None:
            continue
        if abs(col.skew) >= 2.5 and col.outlier_count:
            out.append(_insight(
                "skew", "⚡", "info",
                f"{col.name} is heavily {'right' if col.skew > 0 else 'left'}-skewed (skew {col.skew:.1f}) — "
                f"{col.outlier_count} outliers dominate the tail.",
                f"pandas .skew() = {col.skew:.2f}; IQR rule (1.5×) outliers = {col.outlier_count}",
            ))
    return out[:2]


def _correlations(df: pd.DataFrame, profile: DatasetProfile) -> list[dict]:
    if len(profile.measures) < 2:
        return []
    try:
        num = df[profile.measures].apply(pd.to_numeric, errors="coerce")
        corr = num.corr()
        best, pair = 0.0, None
        for i, a in enumerate(profile.measures):
            for b in profile.measures[i + 1:]:
                r = corr.loc[a, b]
                if pd.notna(r) and abs(r) > abs(best):
                    best, pair = float(r), (a, b)
        if pair and abs(best) >= 0.5:
            return [_insight(
                "correlation", "🔗", "info",
                f"{pair[0]} and {pair[1]} are {'strongly' if abs(best) >= 0.7 else 'moderately'} "
                f"{'positively' if best > 0 else 'negatively'} correlated (r = {best:.2f}).",
                f"df[['{pair[0]}','{pair[1]}']].corr() → Pearson r = {best:.4f}",
            )]
    except Exception:
        pass
    return []


def _quality(profile: DatasetProfile) -> list[dict]:
    out = []
    for col in profile.columns:
        if col.missing_pct >= 20:
            out.append(_insight(
                "quality", "⚠", "warning",
                f"{col.name} is {col.missing_pct:.0f}% empty — treat with care in any analysis.",
                f"{col.missing_count} nulls → missing_pct = {col.missing_pct:.2f}%",
            ))
        if col.unique_count == 1:
            out.append(_insight(
                "quality", "⚠", "warning",
                f"{col.name} is constant (a single value) — it carries no signal.",
                f"nunique() = 1",
            ))
    return out[:2]


# ── quality score ────────────────────────────────────────────────────────────

def quality_score(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    """0–100 data-quality score with the deductions itemized (auditable)."""
    deductions: list[dict[str, Any]] = []
    score = 100.0

    avg_missing = float(np.mean([c.missing_pct for c in profile.columns])) if profile.columns else 0.0
    if avg_missing > 0:
        d = min(30.0, avg_missing * 1.5)
        deductions.append({"reason": f"Average {avg_missing:.1f}% missing values", "points": round(d, 1)})
        score -= d

    dup = int(df.duplicated().sum())
    if dup:
        d = min(20.0, dup / len(df) * 100 * 2)
        deductions.append({"reason": f"{dup} duplicate rows ({dup/len(df):.1%})", "points": round(d, 1)})
        score -= d

    constants = [c.name for c in profile.columns if c.unique_count == 1]
    if constants:
        d = 5.0 * len(constants)
        deductions.append({"reason": f"Constant column(s): {', '.join(constants[:3])}", "points": d})
        score -= d

    heavy_outliers = [c.name for c in profile.columns if c.semantic_type == "measure" and c.outlier_count and c.outlier_count > len(df) * 0.05]
    if heavy_outliers:
        d = 4.0 * len(heavy_outliers)
        deductions.append({"reason": f"Heavy outliers in: {', '.join(heavy_outliers[:3])}", "points": d})
        score -= d

    score = max(0.0, round(score, 1))
    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D" if score >= 40 else "F"
    return {"score": score, "grade": grade, "duplicate_rows": dup, "deductions": deductions}


# ── executive summary ────────────────────────────────────────────────────────

def executive_summary(df: pd.DataFrame, profile: DatasetProfile, insights: list[dict]) -> str:
    measure = next((m for m in profile.measures if _is_money_like(m)), profile.measures[0] if profile.measures else None)
    parts: list[str] = []

    span = ""
    if profile.temporals:
        tc = next((c for c in profile.columns if c.name == profile.temporals[0]), None)
        if tc and tc.min_date and tc.max_date:
            span = f" spanning {tc.min_date[:10]} to {tc.max_date[:10]}"
    parts.append(f"This dataset contains {profile.row_count:,} records across {profile.column_count} fields{span}.")

    if measure:
        s = pd.to_numeric(df[measure], errors="coerce").dropna()
        if not s.empty:
            total = _fmt_money(float(s.sum())) if _is_money_like(measure) else f"{s.sum():,.0f}"
            parts.append(f"Total {measure} is {total} (mean {s.mean():,.0f}, median {s.median():,.0f}).")

    # Weave in the two strongest findings as sentences.
    for ins in insights[:2]:
        parts.append(ins["text"])

    return " ".join(parts)


# ── entry point ──────────────────────────────────────────────────────────────

def generate_insights(df: pd.DataFrame, profile: DatasetProfile) -> dict[str, Any]:
    measure = next((m for m in profile.measures if _is_money_like(m)), profile.measures[0] if profile.measures else None)

    insights: list[dict] = []
    insights += _risk_concentration(df, profile)
    insights += _comparison_significance(df, profile, measure)
    insights += _trend(df, profile, measure)
    insights += _dominance(df, profile, measure)
    insights += _correlations(df, profile)
    insights += _skew_outliers(df, profile)
    insights += _quality(profile)

    quality = quality_score(df, profile)
    summary = executive_summary(df, profile, insights)

    return {"insights": insights[:8], "quality": quality, "executive_summary": summary}
