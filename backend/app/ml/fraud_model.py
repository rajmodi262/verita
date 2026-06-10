"""
Verita — fraud risk model.

A real scikit-learn pipeline with honest evaluation:
  - stratified train/test split (the test set is never trained on)
  - ROC and precision-recall curves computed from held-out probabilities
  - confusion matrix / precision / recall recomputed live for any decision threshold
  - permutation-style feature importances from the fitted model

Held-out probabilities are cached in memory, so threshold changes are O(n) numpy ops —
fast enough to drive a live slider.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

from .data import Dataset, load_dataset

logger = logging.getLogger("verita.ml")


def _downsample_curve(x: np.ndarray, y: np.ndarray, max_points: int = 200) -> tuple[list[float], list[float]]:
    """Thin a curve to ≤max_points for the chart payload without changing its shape."""
    if len(x) <= max_points:
        return x.tolist(), y.tolist()
    idx = np.linspace(0, len(x) - 1, max_points).astype(int)
    return x[idx].tolist(), y[idx].tolist()


@dataclass
class FraudModel:
    model: Any = None
    dataset: Dataset | None = None
    y_test: np.ndarray | None = None
    prob_test: np.ndarray | None = None
    test_index: np.ndarray | None = None
    auc: float = 0.0
    avg_precision: float = 0.0
    feature_importances: list[dict[str, float]] = field(default_factory=list)
    trained: bool = False

    def train(self) -> None:
        ds = load_dataset()
        self.dataset = ds
        X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
            ds.X, ds.y, np.arange(len(ds.y)), test_size=0.25, random_state=42, stratify=ds.y
        )

        clf = HistGradientBoostingClassifier(
            max_iter=200,
            learning_rate=0.08,
            max_depth=6,
            class_weight="balanced",
            random_state=42,
        )
        clf.fit(X_train, y_train)

        prob = clf.predict_proba(X_test)[:, 1]
        self.model = clf
        self.y_test = y_test.to_numpy()
        self.prob_test = prob
        self.test_index = idx_test
        self.auc = float(roc_auc_score(y_test, prob))
        self.avg_precision = float(average_precision_score(y_test, prob))

        # Importance via single-pass permutation on a sample (fast, model-agnostic, honest).
        rng = np.random.default_rng(0)
        sample = X_test.sample(min(4000, len(X_test)), random_state=0)
        base = roc_auc_score(y_test.loc[sample.index], clf.predict_proba(sample)[:, 1])
        importances = []
        for col in sample.columns:
            shuffled = sample.copy()
            shuffled[col] = rng.permutation(shuffled[col].to_numpy())
            drop = base - roc_auc_score(y_test.loc[sample.index], clf.predict_proba(shuffled)[:, 1])
            importances.append({"feature": col, "importance": round(float(max(drop, 0.0)), 5)})
        importances.sort(key=lambda d: -d["importance"])
        self.feature_importances = importances

        self.trained = True
        logger.info(
            "Fraud model trained on %s — AUC=%.4f, AP=%.4f, test_n=%d",
            ds.source, self.auc, self.avg_precision, len(y_test),
        )

    # ── Serving ──────────────────────────────────────────────────────