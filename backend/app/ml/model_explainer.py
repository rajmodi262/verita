"""
Verita — Model Explainer & Cost-Sensitive Decision Layer.

The raw scikit-learn pipeline in ``risk_engine.py`` answers "how likely is fraud?".
It does NOT answer the three questions a financial-crime model actually has to answer
under model-risk-management rules (SR 11-7) and fair-treatment rules (FCRA adverse
action). This module adds exactly those three, as pure, importable, testable functions:

1. ``reason_codes()`` — turns a SHAP attribution vector into ranked, plain-English
   "adverse-action" reason codes. A bare probability ("0.81") is not actionable for an
   analyst and not defensible to a regulator; the law in several jurisdictions requires
   that an automated decline cite the *specific* reasons. We derive those reasons from the
   model's own SHAP contributions, so the explanation can never disagree with the score.

2. ``optimal_threshold()`` — chooses the decision cut-off by **expected dollar cost**, not
   the textbook 0.5. In fraud a missed fraud (false negative) costs far more than a need-
   less review (false positive), so the loss-minimising threshold is a decision-theory
   result, not a guess. We return the cost-optimal threshold AND the dollars it saves over
   a naive 0.5 cut-off — the number that justifies the project to a CFO.

3. ``population_stability_index()`` — a PSI drift monitor. Models decay silently when live
   traffic drifts away from the training distribution (new fraud patterns, new geographies).
   PSI is the bank-standard early-warning statistic; we flag when re-validation is due
   *before* accuracy quietly collapses.

Everything here is dependency-light (numpy only) and side-effect free, so it is trivial to
unit-test and safe to call from the service layer.
"""

from __future__ import annotations

from typing import Any

import numpy as np

# ── feature glossary ─────────────────────────────────────────────────────────
# Maps the engineered feature names (synthetic FCC + Kaggle financial-fraud schemas)
# to a human label, the business reason the feature matters, and how to read a HIGH value.
# Lookup is substring-based and case-insensitive so one-hot suffixes
# (e.g. "payment_channel_Crypto") and minor renames still resolve.
_GLOSSARY: list[tuple[str, dict[str, str]]] = [
    ("amount_log", {"label": "Transaction amount",
                    "why": "large transfers move more value per fraudulent event and are a money-laundering staple",
                    "high": "an unusually large amount"}),
    ("amount", {"label": "Transaction amount",
                "why": "large transfers move more value per fraudulent event",
                "high": "an unusually large amount"}),
    ("hour_of_day", {"label": "Time of day",
                     "why": "fraud rings operate off-hours when monitoring staff are thin",
                     "high": "a late-night / off-hours timestamp"}),
    ("velocity", {"label": "Transaction velocity",
                  "why": "rapid bursts of activity signal card-testing or fast cash-out before detection",
                  "high": "a rapid burst of transactions in a short window"}),
    ("geo_anomaly", {"label": "Geographic anomaly",
                     "why": "spending far from a customer's normal footprint is a hallmark of account takeover",
                     "high": "activity far from the customer's usual location"}),
    ("geo_risk", {"label": "Geographic risk",
                  "why": "some jurisdictions carry elevated AML / sanctions exposure",
                  "high": "a higher-risk jurisdiction"}),
    ("kyc_risk", {"label": "KYC due-diligence tier",
                  "why": "weakly verified customers are easier to abuse for laundering",
                  "high": "a weakly-verified (low-KYC) customer"}),
    ("channel_risk", {"label": "Payment-channel risk",
                      "why": "irreversible rails (crypto, wire) are favoured by fraudsters over reversible cards",
                      "high": "a higher-risk payment channel"}),
    ("channel", {"label": "Payment channel",
                 "why": "irreversible rails (crypto, wire) carry more fraud than reversible cards",
                 "high": "a higher-risk payment channel"}),
    ("merchant_risk", {"label": "Merchant risk profile",
                       "why": "certain merchant categories are disproportionately used for fraud",
                       "high": "a higher-risk merchant category"}),
    ("merchant", {"label": "Merchant category",
                  "why": "certain merchant categories are disproportionately used for fraud",
                  "high": "a higher-risk merchant category"}),
    ("cross_border", {"label": "Cross-border flag",
                      "why": "cross-border flows complicate tracing and oversight",
                      "high": "a cross-border transaction"}),
    ("spending_deviation", {"label": "Spending deviation from norm",
                            "why": "a sudden break from a customer's baseline spend pattern signals takeover",
                            "high": "spending well outside the customer's normal pattern"}),
    ("mins_since_last", {"label": "Time since last transaction",
                         "why": "very short gaps indicate automated or scripted abuse",
                         "high": "a long gap since the previous transaction"}),
    ("time_since_last", {"label": "Time since last transaction",
                         "why": "very short gaps indicate automated or scripted abuse",
                         "high": "a long gap since the previous transaction"}),
    ("transaction_type", {"label": "Transaction type",
                          "why": "some transaction types are more fraud-prone than others",
                          "high": "a higher-risk transaction type"}),
    ("device", {"label": "Device used",
                "why": "a new or unusual device is a classic account-takeover signal",
                "high": "an unusual device"}),
    ("location", {"label": "Location familiarity",
                  "why": "rarely-seen locations are weaker to verify and easier to abuse",
                  "high": "a rarely-seen location"}),
    ("time", {"label": "Elapsed time in batch",
              "why": "position within a transaction batch can correlate with automated fraud runs",
              "high": "a later position in the batch"}),
]


def _describe(feature: str) -> dict[str, str]:
    """Resolve a feature name to a human description, with a safe fallback.

    The ULB credit-card dataset ships anonymized PCA components (V1..V28) with no business
    meaning by design (privacy). We cannot invent semantics for those, so we say so honestly
    rather than fabricate a story — which is exactly the posture a regulator wants to see.
    """
    f = feature.lower()
    for key, meta in _GLOSSARY:
        if key in f:
            return meta
    # Anonymized PCA component or an unmapped feature — be honest about the opacity.
    return {
        "label": f"Risk signal '{feature}'",
        "why": "a learned statistical signal (the public dataset anonymizes this feature, so its "
               "real-world meaning is intentionally hidden)",
        "high": f"an unusual value of '{feature}'",
    }


def _sigmoid(x: float) -> float:
    # Numerically stable logistic — converts the model's log-odds output to a probability.
    return float(1.0 / (1.0 + np.exp(-np.clip(x, -50, 50))))


def reason_codes(
    feature_names: list[str],
    shap_values: list[float] | np.ndarray,
    feature_values: list[float] | np.ndarray | None = None,
    base_value: float = 0.0,
    top_k: int = 4,
    output_space: str = "logodds",
) -> dict[str, Any]:
    """Turn one transaction's SHAP attribution vector into ranked, plain-English reason codes.

    SHAP guarantees ``base_value + sum(shap_values) == model log-odds output`` (local accuracy /
    additivity). That property is what makes the explanation trustworthy: the reasons we print are
    literally the additive pieces of the score the model produced — not a separate, possibly-
    disagreeing surrogate model.

    Parameters
    ----------
    feature_names : the model's feature columns, in order.
    shap_values   : per-feature SHAP contribution (in log-odds space) for THIS transaction.
    feature_values: the raw feature values for this transaction (optional, for context).
    base_value    : the explainer's expected value (average log-odds over the background set).
    top_k         : how many drivers to surface (regulators typically expect 3–5 reason codes).

    Returns a dict with the reconstructed probability and the ranked drivers, each carrying its
    direction (raised / lowered risk), magnitude, and a regulator-readable sentence.
    """
    shap = np.asarray(shap_values, dtype=float).ravel()
    if shap.shape[0] != len(feature_names):
        raise ValueError(
            f"shap_values length ({shap.shape[0]}) != feature_names length ({len(feature_names)})"
        )
    vals = (
        np.asarray(feature_values, dtype=float).ravel()
        if feature_values is not None
        else np.full(len(feature_names), np.nan)
    )

    # SHAP can be supplied in two spaces. In log-odds space the additive sum is a logit and we
    # squash it; in probability space the sum already IS the fraud probability (this is what the
    # interventional/probability-output explainer in risk_engine produces — see its train()).
    raw = float(base_value) + float(shap.sum())
    if output_space == "probability":
        probability = float(np.clip(raw, 0.0, 1.0))
        unit = "prob"
    else:
        probability = _sigmoid(raw)
        unit = "log-odds"
    total_abs = float(np.abs(shap).sum()) or 1.0  # avoid /0 when all contributions are zero

    # Rank by absolute contribution — the biggest movers of the decision come first.
    order = np.argsort(np.abs(shap))[::-1][:top_k]

    drivers: list[dict[str, Any]] = []
    for i in order:
        i = int(i)
        contrib = float(shap[i])
        meta = _describe(feature_names[i])
        direction = "increased" if contrib > 0 else "decreased"
        # Share of the total explanation magnitude this feature owns — an intuitive % for analysts.
        weight_pct = round(abs(contrib) / total_abs * 100, 1)
        sentence = (
            f"{meta['label']} {direction} the fraud risk "
            f"({'+' if contrib > 0 else ''}{round(contrib, 3)} {unit}, {weight_pct}% of the decision) — "
            f"{meta['why']}."
        )
        drivers.append({
            "feature": feature_names[i],
            "label": meta["label"],
            "shap": round(contrib, 4),
            "direction": "raises_risk" if contrib > 0 else "lowers_risk",
            "weight_pct": weight_pct,
            "value": (None if np.isnan(vals[i]) else round(float(vals[i]), 4)),
            "reason": sentence,
        })

    # Plain-English headline an analyst (or auditor) can paste into a case note.
    risk_word = "HIGH" if probability >= 0.5 else "LOW"
    top_raisers = [d["label"] for d in drivers if d["direction"] == "raises_risk"][:3]
    if top_raisers:
        headline = (
            f"Flagged at {probability:.0%} fraud probability ({risk_word} risk). "
            f"Primary drivers: {', '.join(top_raisers)}."
        )
    else:
        headline = (
            f"Scored at {probability:.0%} fraud probability ({risk_word} risk); "
            f"no individual feature pushed strongly toward fraud."
        )

    return {
        "predicted_probability": round(probability, 4),
        "model_logit": round(raw, 4),
        "output_space": output_space,
        "base_value": round(float(base_value), 4),
        "decision": "REVIEW" if probability >= 0.5 else "PASS",
        "headline": headline,
        "reason_codes": drivers,
        "method": (
            "SHAP additive attribution (base_value + Σ shap = "
            + ("fraud probability)" if output_space == "probability" else "model log-odds)")
        ),
    }


def optimal_threshold(
    y_true: list[int] | np.ndarray,
    y_proba: list[float] | np.ndarray,
    cost_fn: float = 500.0,
    cost_fp: float = 5.0,
    grid: int = 199,
    currency: str = "$",
) -> dict[str, Any]:
    """Pick the decision threshold that minimises **expected dollar cost**, not accuracy.

    The textbook 0.5 cut-off implicitly assumes a false negative and a false positive cost the
    same. In fraud they do not: letting a fraud through (FN) costs the charged-back transaction
    value plus investigation and write-off, while a needless review (FP) costs a few minutes of
    analyst time. So the right threshold solves::

        argmin_t   cost_fn * FN(t) + cost_fp * FP(t)

    Parameters
    ----------
    cost_fn : dollar cost of one missed fraud (default $500 — a conservative blended figure).
    cost_fp : dollar cost of one false alarm / needless manual review (default $5).

    Returns the cost-optimal threshold, its confusion-matrix and cost, the cost at the naive 0.5
    baseline, and the **savings** — the headline number for a business case.
    """
    y = np.asarray(y_true, dtype=int).ravel()
    p = np.asarray(y_proba, dtype=float).ravel()
    if y.shape[0] != p.shape[0] or y.shape[0] == 0:
        raise ValueError("y_true and y_proba must be the same non-zero length")

    def _cost_at(t: float) -> dict[str, Any]:
        yhat = (p >= t).astype(int)
        tp = int(np.sum((yhat == 1) & (y == 1)))
        fp = int(np.sum((yhat == 1) & (y == 0)))
        fn = int(np.sum((yhat == 0) & (y == 1)))
        tn = int(np.sum((yhat == 0) & (y == 0)))
        cost = cost_fn * fn + cost_fp * fp
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        return {"threshold": round(float(t), 4), "tp": tp, "fp": fp, "fn": fn, "tn": tn,
                "expected_cost": round(float(cost), 2),
                "precision": round(precision, 4), "recall": round(recall, 4)}

    # Sweep the open interval (0,1); endpoints are degenerate (flag-all / flag-none).
    thresholds = np.linspace(1.0 / (grid + 1), grid / (grid + 1), grid)
    sweep = [_cost_at(t) for t in thresholds]
    best = min(sweep, key=lambda r: r["expected_cost"])
    baseline = _cost_at(0.5)

    savings = round(baseline["expected_cost"] - best["expected_cost"], 2)
    saving_pct = round(savings / baseline["expected_cost"] * 100, 1) if baseline["expected_cost"] else 0.0

    return {
        "cost_fn": cost_fn,
        "cost_fp": cost_fp,
        "currency": currency,
        "optimal_threshold": best["threshold"],
        "optimal": best,
        "baseline_0_5": baseline,
        "savings_vs_0_5": savings,
        "savings_pct": saving_pct,
        # The cost curve, thinned, so the UI can plot "expected loss vs threshold".
        "cost_curve": [{"threshold": r["threshold"], "expected_cost": r["expected_cost"]}
                       for r in sweep[:: max(1, len(sweep) // 80)]],
        "interpretation": (
            f"With a missed fraud costing {currency}{cost_fn:,.0f} and a false alarm "
            f"{currency}{cost_fp:,.0f}, the expected-loss-minimising threshold is {best['threshold']:.3f} "
            f"(recall {best['recall']:.0%}, precision {best['precision']:.0%}), "
            f"saving {currency}{savings:,.0f} ({saving_pct:.0f}%) over a naive 0.5 cut-off on this test set."
        ),
    }


def population_stability_index(
    expected: list[float] | np.ndarray,
    actual: list[float] | np.ndarray,
    bins: int = 10,
) -> dict[str, Any]:
    """Population Stability Index — the bank-standard drift statistic for one feature/score.

    PSI compares the distribution the model was trained on (``expected``) with what it is seeing
    now (``actual``). Rule of thumb used across credit & fraud model governance::

        PSI < 0.10            no meaningful shift          → model still valid
        0.10 ≤ PSI < 0.25     moderate shift               → investigate / monitor
        PSI ≥ 0.25            major shift                  → re-train / re-validate

    Quantile bins are cut on the *expected* distribution so each baseline bin holds ~equal mass;
    a small epsilon floors empty bins to keep the log finite.
    """
    e = np.asarray(expected, dtype=float).ravel()
    a = np.asarray(actual, dtype=float).ravel()
    if e.size == 0 or a.size == 0:
        raise ValueError("expected and actual must be non-empty")

    # Quantile edges from the baseline; widen the outer edges so live values beyond the
    # training range still fall into the end bins instead of being dropped.
    quantiles = np.linspace(0, 1, bins + 1)
    edges = np.unique(np.quantile(e, quantiles))
    if edges.size < 2:  # constant baseline — no spread to measure drift against
        return {"psi": 0.0, "severity": "none", "bins": 1,
                "interpretation": "Baseline feature is constant; PSI is undefined → reported as 0."}
    edges[0], edges[-1] = -np.inf, np.inf

    eps = 1e-6
    e_pct = np.histogram(e, bins=edges)[0] / e.size
    a_pct = np.histogram(a, bins=edges)[0] / a.size
    e_pct = np.clip(e_pct, eps, None)
    a_pct = np.clip(a_pct, eps, None)

    psi_per_bin = (a_pct - e_pct) * np.log(a_pct / e_pct)
    psi = float(np.sum(psi_per_bin))

    severity = "major" if psi >= 0.25 else "moderate" if psi >= 0.10 else "none"
    advice = {
        "major": "Major population shift — re-train / re-validate the model before relying on it.",
        "moderate": "Moderate shift — investigate which segment moved and increase monitoring.",
        "none": "No meaningful drift — the model remains within its validated population.",
    }[severity]

    return {
        "psi": round(psi, 4),
        "severity": severity,
        "bins": int(edges.size - 1),
        "psi_per_bin": [round(float(x), 5) for x in psi_per_bin],
        "interpretation": f"PSI = {psi:.3f} ({severity}). {advice}",
    }
