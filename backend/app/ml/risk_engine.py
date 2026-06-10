"""
Verita — FCC Risk & Anomaly Engine.

A real scikit-learn pipeline:
  • GradientBoosting classifier for fraud probability (trained on a held-out split).
  • IsolationForest for unsupervised anomaly scoring (feeds the AML alert queue).

All metrics are measured on the held-out test set at request time — ROC, precision-recall,
confusion matrix at an arbitrary decision threshold, and permutation-free model feature
importances. Nothing here is hardcoded.

Trained lazily once on first use and cached on app state.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest
from sklearn.metrics import (
    auc,
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

from .data import Dataset, load_dataset

logger = logging.getLogger("verita.ml")


def _downsample_curve(xs: np.ndarray, ys: np.ndarray, n: int = 100) -> list[dict[str, float]]:
    """Thin a curve to ~n points so the JSON payload stays small but the shape is preserved."""
    if len(xs) <= n:
        idx = range(len(xs))
    else:
        idx = np.linspace(0, len(xs) - 1, n).astype(int)
    return [{"x": round(float(xs[i]), 4), "y": round(float(ys[i]), 4)} for i in idx]


@dataclass
class RiskEngine:
    clf: GradientBoostingClassifier | None = None
    iforest: IsolationForest | None = None
    dataset: Dataset | None = None
    X_test: pd.DataFrame | None = None
    y_test: pd.Series | None = None
    y_proba: np.ndarray | None = None
    feature_names: list[str] = field(default_factory=list)

    def train(self) -> None:
        ds = load_dataset()
        self.dataset = ds
        self.feature_names = list(ds.X.columns)

        X_tr, X_te, y_tr, y_te = train_test_split(
            ds.X, ds.y, test_size=0.25, random_state=42, stratify=ds.y
        )
        self.clf = GradientBoostingClassifier(
            n_estimators=160, max_depth=3, learning_rate=0.1, subsample=0.9, random_state=42
        )
        self.clf.fit(X_tr, y_tr)

        self.iforest = IsolationForest(
            n_estimators=150, contamination=float(max(ds.y.mean(), 0.005)), random_state=42, n_jobs=-1
        )
        self.iforest.fit(X_tr)

        # Keep original indices so alert rows map back to their source transactions.
        self.X_test, self.y_test = X_te, y_te
        self.y_proba = self.clf.predict_proba(X_te)[:, 1]
        logger.info(
            "Risk engine trained on %s — test AUC %.3f",
            ds.source, roc_auc_score(self.y_test, self.y_proba),
        )

    # ── metrics ──────────────────────────────────────────────────────────────
    def metrics(self, threshold: float = 0.5) -> dict[str, Any]:
        assert self.y_test is not None and self.y_proba is not None
        y, p = self.y_test.to_numpy(), self.y_proba
        y_hat = (p >= threshold).astype(int)

        fpr, tpr, _ = roc_curve(y, p)
        prec, rec, _ = precision_recall_curve(y, p)
        tn, fp, fn, tp = confusion_matrix(y, y_hat, labels=[0, 1]).ravel()

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

        return {
            "data_source": self.dataset.source,
            "data_description": self.dataset.description,
            "test_size": int(len(y)),
            "fraud_in_test": int(y.sum()),
            "threshold": round(threshold, 3),
            "roc_auc": round(float(roc_auc_score(y, p)), 4),
            "pr_auc": round(float(average_precision_score(y, p)), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "roc_curve": _downsample_curve(fpr, tpr),
            "pr_curve": _downsample_curve(rec, prec),
            "feature_importance": self._feature_importance(),
        }

    def _feature_importance(self) -> list[dict[str, Any]]:
        imp = self.clf.feature_importances_
        pairs = sorted(zip(self.feature_names, imp), key=lambda kv: kv[1], reverse=True)
        return [{"feature": f, "importance": round(float(v), 4)} for f, v in pairs]

    # ── alert queue ──────────────────────────────────────────────────────────
    def alerts(self, threshold: float = 0.5, limit: int = 25) -> dict[str, Any]:
        """Rank the riskiest test transactions for an AML analyst queue."""
        assert self.y_test is not None and self.y_proba is not None
        anomaly = -self.iforest.score_samples(self.X_test)  # higher = more anomalous
        a_norm = (anomaly - anomaly.min()) / (np.ptp(anomaly) + 1e-9)

        rows = []
        tx = self.dataset.transactions
        order = np.argsort(self.y_proba)[::-1][:limit]
        for rank, i in enumerate(order):
            score = float(self.y_proba[i])
            tier = "Critical" if score >= 0.8 else "High" if score >= 0.5 else "Medium" if score >= 0.25 else "Low"
            row = {
                "rank": rank + 1,
                "risk_score": round(score * 100, 1),
                "risk_tier": tier,
                "anomaly_score": round(float(a_norm[i]), 3),
                "is_fraud_actual": int(self.y_test.iloc[i]),
                "flagged": bool(score >= threshold),
            }
            if tx is not None:
                # X_test retains original indices → map straight back to the source transaction.
                src = tx.loc[self.X_test.index[i]]
                row.update(
                    transaction_id=str(src["transaction_id"]),
                    amount=float(src["amount"]),
                    channel=str(src["channel"]),
                    country=str(src["country"]),
                )
            else:
                row.update(transaction_id=f"TX{int(self.X_test.index[i]):06d}", amount=0.0, channel="—", country="—")
            rows.append(row)
        return {"data_source": self.dataset.source, "threshold": round(threshold, 3), "alerts": rows}


def get_engine(app_state) -> RiskEngine:
    """Return the cached engine, training it on first access."""
    engine = getattr(app_state, "risk_engine", None)
    if engine is None:
        engine = RiskEngine()
        engine.train()
        app_state.risk_engine = engine
    return engine
