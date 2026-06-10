"""
Verita — training data loader.

Prefers the real ULB credit-card fraud dataset if the user has downloaded it to
``data/creditcard.csv`` (https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud).
Otherwise generates a labeled synthetic FCC transaction dataset with *real* signal —
fraud probability is a noisy logistic function of risk features, so a model genuinely
has something to learn and held-out metrics are honest measurements, not props.

The response of every ML endpoint includes ``data_source`` so the UI can state
plainly which dataset the model was trained on.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
import pandas as pd

# Repo root /data — works no matter where uvicorn is launched from.
_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
REAL_DATASET_PATH = os.path.join(_DATA_DIR, "creditcard.csv")

CHANNEL_RISK = {"Card": 0.2, "ACH": 0.3, "Wire": 0.6, "SWIFT": 0.7, "Crypto": 0.9}
GEO_RISK = {"US": 0.1, "GB": 0.15, "DE": 0.15, "SG": 0.3, "AE": 0.5, "CN": 0.5, "KY": 0.8, "RU": 0.85}
KYC_RISK = {"Tier 1": 0.1, "Tier 2": 0.5, "Tier 3": 0.9}

FEATURE_NAMES = [
    "amount_log",
    "hour_of_day",
    "velocity_24h",
    "channel_risk",
    "geo_risk",
    "kyc_risk",
    "merchant_risk",
    "is_cross_border",
]


@dataclass
class Dataset:
    X: pd.DataFrame
    y: pd.Series
    source: str  # "ulb_creditcard" | "synthetic_fcc"
    description: str
    transactions: pd.DataFrame | None = None  # raw rows for the alert queue (synthetic only)


def _generate_synthetic(n: int = 24000, seed: int = 42) -> Dataset:
    rng = np.random.default_rng(seed)

    channels = rng.choice(list(CHANNEL_RISK), n, p=[0.42, 0.22, 0.18, 0.10, 0.08])
    geos = rng.choice(list(GEO_RISK), n, p=[0.34, 0.14, 0.12, 0.10, 0.08, 0.08, 0.07, 0.07])
    kyc = rng.choice(list(KYC_RISK), n, p=[0.55, 0.30, 0.15])
    amount = rng.lognormal(6.0, 1.4, n)
    hour = rng.integers(0, 24, n)
    velocity = rng.poisson(2.2, n).clip(0, 30)
    merchant_risk = rng.beta(2, 5, n)
    cross_border = (rng.random(n) < 0.25).astype(int)

    X = pd.DataFrame(
        {
            "amount_log": np.log1p(amount),
            "hour_of_day": hour.astype(float),
            "velocity_24h": velocity.astype(float),
            "channel_risk": np.vectorize(CHANNEL_RISK.get)(channels),
            "geo_risk": np.vectorize(GEO_RISK.get)(geos),
            "kyc_risk": np.vectorize(KYC_RISK.get)(kyc),
            "merchant_risk": merchant_risk,
            "is_cross_border": cross_border.astype(float),
        }
    )

    # Latent fraud propensity: weighted risk drivers + interaction + noise → ~1.7% positives.
    night = ((hour >= 22) | (hour <= 4)).astype(float)
    z = (
        3.0 * X["channel_risk"]
        + 3.4 * X["geo_risk"]
        + 2.2 * X["kyc_risk"]
        + 1.8 * X["merchant_risk"]
        + 0.8 * (X["amount_log"] - X["amount_log"].mean()) / X["amount_log"].std()
        + 0.6 * (X["velocity_24h"] / 10)
        + 1.1 * night
        + 1.3 * X["is_cross_border"] * X["geo_risk"]  # cross-border into risky geo
        + rng.normal(0, 0.5, n)  # irreducible noise — a real model can't be perfect
        - 8.6
    )
    y = pd.Series((rng.random(n) < 1 / (1 + np.exp(-z))).astype(int), name="is_fraud")

    tx = pd.DataFrame(
        {
            "transaction_id": [f"TX{i:06d}" for i in range(n)],
            "amount": amount.round(2),
            "channel": channels,
            "country": geos,
            "kyc_level": kyc,
            "hour_of_day": hour,
            "velocity_24h": velocity,
        }
    )

    return Dataset(
        X=X,
        y=y,
        source="synthetic_fcc",
        description=(
            f"Labeled synthetic FCC dataset ({n:,} transactions, {y.mean():.2%} fraud). "
            "Drop the ULB creditcard.csv into data/ to train on real data."
        ),
        transactions=tx,
    )


def _load_ulb() -> Dataset:
    df = pd.read_csv(REAL_DATASET_PATH)
    y = df["Class"].astype(int).rename("is_fraud")
    X = df.drop(columns=["Class"])
    return Dataset(
        X=X,
        y=y,
        source="ulb_creditcard",
        description=(
            f"ULB credit-card fraud dataset ({len(df):,} transactions, {y.mean():.2%} fraud) — "
            "real anonymized European card transactions."
        ),
    )


def load_dataset() -> Dataset:
    if os.path.exists(REAL_DATASET_PATH):
        return _load_ulb()
    return _generate_synthetic()
