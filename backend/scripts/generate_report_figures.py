"""
Generate static report figures from the trained risk engine.

The live app already renders these interactively (ECharts), but an interview / slide deck /
README needs portable PNGs. Run this once to drop publication-quality charts into
``backend/reports/``:

    cd backend
    python scripts/generate_report_figures.py

Produces (all computed from the REAL held-out test set — nothing hardcoded):
    confusion_matrix.png      the TP/FP/FN/TN grid at the chosen threshold
    roc_curve.png             ROC with the AUC annotated
    pr_curve.png              precision-recall (the curve that matters under class imbalance)
    feature_importance.png    permutation importance (model-agnostic, ROC-AUC drop)
    shap_summary.png          mean |SHAP| per feature (if shap is installed)
    cost_vs_threshold.png     expected $ loss vs threshold, with the cost-optimal point marked
"""

from __future__ import annotations

import os
import sys

# Make `app` importable whether run from repo root or backend/.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import numpy as np

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "reports"))
THRESHOLD = float(os.getenv("VERITA_FIG_THRESHOLD", "0.5"))


def main() -> None:
    try:
        import matplotlib
        matplotlib.use("Agg")  # headless — no display needed
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib is required: pip install matplotlib")
        sys.exit(1)

    import types

    from app.ml.risk_engine import get_engine
    from app.ml.model_explainer import optimal_threshold

    os.makedirs(OUT_DIR, exist_ok=True)
    engine = get_engine(types.SimpleNamespace())
    m = engine.metrics(THRESHOLD)
    print(f"Data source: {m['data_source']}  |  ROC-AUC {m['roc_auc']}  PR-AUC {m['pr_auc']}")

    # —— 1. Confusion matrix ——
    cm = m["confusion_matrix"]
    grid = np.array([[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]])
    fig, ax = plt.subplots(figsize=(4.5, 4))
    ax.imshow(grid, cmap="Blues")
    for (i, j), v in np.ndenumerate(grid):
        ax.text(j, i, f"{v:,}", ha="center", va="center",
                color="white" if v > grid.max() / 2 else "black", fontsize=13, fontweight="bold")
    ax.set_xticks([0, 1]); ax.set_xticklabels(["Pred: Legit", "Pred: Fraud"])
    ax.set_yticks([0, 1]); ax.set_yticklabels(["True: Legit", "True: Fraud"])
    ax.set_title(f"Confusion Matrix @ threshold {THRESHOLD}")
    fig.tight_layout(); fig.savefig(os.path.join(OUT_DIR, "confusion_matrix.png"), dpi=140); plt.close(fig)

    # —— 2. ROC curve ——
    roc = m["roc_curve"]
    fig, ax = plt.subplots(figsize=(5, 4.2))
    ax.plot([r["x"] for r in roc], [r["y"] for r in roc], lw=2, label=f"AUC = {m['roc_auc']}")
    ax.plot([0, 1], [0, 1], "--", color="gray", lw=1, label="Random")
    ax.set_xlabel("False Positive Rate"); ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve (held-out test set)"); ax.legend(loc="lower right")
    fig.tight_layout(); fig.savefig(os.path.join(OUT_DIR, "roc_curve.png"), dpi=140); plt.close(fig)

    # —— 3. Precision-Recall curve (the honest one under 0.17% fraud) ——
    pr = m["pr_curve"]
    fig, ax = plt.subplots(figsize=(5, 4.2))
    ax.plot([r["x"] for r in pr], [r["y"] for r in pr], lw=2, color="#b4232c",
            label=f"PR-AUC = {m['pr_auc']}")
    ax.set_xlabel("Recall"); ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve"); ax.legend(loc="upper right")
    fig.tight_layout(); fig.savefig(os.path.join(OUT_DIR, "pr_curve.png"), dpi=140); plt.close(fig)

    # —— 4. Permutation feature importance ——
    fi = m["feature_importance"][:12][::-1]
    fig, ax = plt.subplots(figsize=(6, 4.6))
    ax.barh([f["feature"] for f in fi], [f["importance"] for f in fi], color="#2b6cb0")
    ax.set_xlabel("Permutation importance (mean ROC-AUC drop)")
    ax.set_title("Feature Importance"); fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "feature_importance.png"), dpi=140); plt.close(fig)

    # —— 5. SHAP summary (mean |SHAP|) ——
    shap_imp = m.get("shap_importances") or []
    if shap_imp:
        top = shap_imp[:12][::-1]
        fig, ax = plt.subplots(figsize=(6, 4.6))
        ax.barh([s["feature"] for s in top], [s["mean_abs_shap"] for s in top], color="#6b46c1")
        ax.set_xlabel("mean |SHAP value| (impact on model output)")
        ax.set_title("SHAP Global Importance"); fig.tight_layout()
        fig.savefig(os.path.join(OUT_DIR, "shap_summary.png"), dpi=140); plt.close(fig)
    else:
        print("SHAP not available — skipping shap_summary.png")

    # —— 6. Expected cost vs threshold (the novelty figure) ——
    opt = optimal_threshold(engine.y_test.to_numpy(), engine.y_proba, cost_fn=500, cost_fp=5)
    curve = opt["cost_curve"]
    fig, ax = plt.subplots(figsize=(5.4, 4.2))
    ax.plot([c["threshold"] for c in curve], [c["expected_cost"] for c in curve], lw=2, color="#0a7d4d")
    ax.axvline(opt["optimal_threshold"], ls="--", color="#b4232c",
               label=f"optimal = {opt['optimal_threshold']:.3f}")
    ax.axvline(0.5, ls=":", color="gray", label="naive 0.5")
    ax.set_xlabel("Decision threshold"); ax.set_ylabel("Expected loss ($)")
    ax.set_title(f"Cost-optimal threshold (saves ${opt['savings_vs_0_5']:,.0f} vs 0.5)")
    ax.legend(); fig.tight_layout()
    fig.savefig(os.path.join(OUT_DIR, "cost_vs_threshold.png"), dpi=140); plt.close(fig)

    print(f"Figures written to {OUT_DIR}")


if __name__ == "__main__":
    main()
