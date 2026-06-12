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


_ULB_SAMPLE = int(os.getenv("VERITA_ULB_SAMPLE", "150000"))


def _load_ulb() -> Dataset:
    df = pd.read_csv(REAL_DATASET_PATH)
    total = len(df)
    # Seeded sample keeps GBM training time reasonable; the natural fraud rate is preserved.
    if total > _ULB_SAMPLE:
        df = df.sample(_ULB_SAMPLE, random_state=42).reset_index(drop=True)
    y = df["Class"].astype(int).rename("is_fraud")
    X = df.drop(columns=["Class"])
    return Dataset(
        X=X,
        y=y,
        source="ulb_creditcard",
        description=(
            f"ULB credit-card fraud dataset — REAL anonymized European card transactions: "
            f"seeded sample of {len(df):,} of {total:,} ({y.mean():.3%} fraud)."
        ),
    )


# Kaggle "Financial Fraud Detection" — 5M labeled transactions. Looked up at the repo root
# or data/, or wherever VERITA_FRAUD_DATA points.
_ROOT = os.path.abspath(os.path.join(_DATA_DIR, ".."))
KAGGLE_CANDIDATES = [
    os.getenv("VERITA_FRAUD_DATA", "").strip(),
    os.path.join(_ROOT, "financial_fraud_detection_dataset.csv"),
    os.path.join(_DATA_DIR, "financial_fraud_detection_dataset.csv"),
]

_KAGGLE_SAMPLE = int(os.getenv("VERITA_FRAUD_SAMPLE", "150000"))


def _kaggle_path() -> str | None:
    return next((p for p in KAGGLE_CANDIDATES if p and os.path.exists(p)), None)


def _load_kaggle_fraud(path: str) -> Dataset:
    """Reservoir-sample the 5M-row Kaggle fraud set via DuckDB and engineer honest features."""
    import duckdb

    con = duckdb.connect()
    total = con.execute(f"SELECT COUNT(*) FROM read_csv_auto('{path}')").fetchone()[0]
    df = con.execute(
        f"SELECT transaction_id, timestamp, amount, transaction_type, merchant_category, "
        f"location, device_used, payment_channel, time_since_last_transaction, "
        f"spending_deviation_score, velocity_score, geo_anomaly_score, is_fraud "
        f"FROM read_csv_auto('{path}') USING SAMPLE reservoir({_KAGGLE_SAMPLE} ROWS) REPEATABLE (42)"
    ).fetchdf()
    con.close()

    y = df["is_fraud"].astype(int).rename("is_fraud")

    X = pd.DataFrame(index=df.index)
    X["amount_log"] = np.log1p(df["amount"].clip(lower=0))
    X["hour_of_day"] = pd.to_datetime(df["timestamp"], errors="coerce").dt.hour.fillna(12).astype(float)
    X["velocity_score"] = pd.to_numeric(df["velocity_score"], errors="coerce").fillna(0.0)
    X["geo_anomaly_score"] = pd.to_numeric(df["geo_anomaly_score"], errors="coerce").fillna(0.0)
    X["spending_deviation"] = pd.to_numeric(df["spending_deviation_score"], errors="coerce").fillna(0.0)
    X["mins_since_last_tx"] = pd.to_numeric(df["time_since_last_transaction"], errors="coerce").fillna(0.0)

    # Low-cardinality categoricals → one-hot; city → frequency encoding (hundreds of values).
    for col in ("payment_channel", "transaction_type", "device_used"):
        dummies = pd.get_dummies(df[col].astype(str), prefix=col, dtype=float)
        X = pd.concat([X, dummies], axis=1)
    for col in ("merchant_category", "location"):
        freq = df[col].astype(str).map(df[col].astype(str).value_counts(normalize=True))
        X[f"{col}_freq"] = freq.fillna(0.0)

    tx = pd.DataFrame({
        "transaction_id": df["transaction_id"].astype(str),
        "amount": pd.to_numeric(df["amount"], errors="coerce").fillna(0.0).round(2),
        "channel": df["payment_channel"].astype(str),
        "country": df["location"].astype(str),
    }, index=df.index)

    return Dataset(
        X=X, y=y, source="kaggle_financial_fraud",
        description=(
            f"Kaggle Financial Fraud Detection dataset — real labeled data: trained on a seeded "
            f"reservoir sample of {len(df):,} of {total:,} transactions ({y.mean():.2%} fraud)."
        ),
        transactions=tx,
    )


def expected_source() -> str:
    """Which source load_dataset() would pick right now — cheap, no data loading."""
    if os.getenv("VERITA_FORCE_SYNTHETIC", "").strip() == "1":
        return "synthetic_fcc"
    if os.path.exists(REAL_DATASET_PATH):
        return "ulb_creditcard"
    if _kaggle_path():
        return "kaggle_financial_fraud"
    return "synthetic_fcc"


def load_dataset() -> Dataset:
    if os.getenv("VERITA_FORCE_SYNTHETIC", "").strip() == "1":
        return _generate_synthetic()
    if os.path.exists(REAL_DATASET_PATH):
        return _load_ulb()
    kp = _kaggle_path()
    if kp:
        return _load_kaggle_fraud(kp)
    return _generate_synthetic()
