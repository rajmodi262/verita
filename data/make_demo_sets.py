"""
Generate two contrasting demo datasets for the Studio / Investigator walkthrough:

  clean_transactions.csv  — legitimate activity, ZERO fraud, no structuring, low-risk geographies.
                            The Investigator should confirm NO material risk indicators.
  fraud_transactions.csv  — seeded with the classic financial-crime signatures the Investigator
                            tests for: structuring just below the $10k reporting threshold,
                            geographic risk concentration, risky-channel skew, and labelled fraud.

Both share one schema so the same SQL / NL questions work on either:
    transaction_id, timestamp, amount, channel, country, kyc_level, is_fraud

Run:  python data/make_demo_sets.py
Deterministic (seeded) — same bytes every time.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))


def _timestamps(rng: np.random.Generator, n: int, spike: bool = False) -> pd.Series:
    """Spread transactions across ~6 months; optionally inject a volume spike in one month."""
    days = rng.integers(0, 180, n)
    if spike:
        # Push a chunk of activity into a single week → a temporal anomaly the agent can flag.
        days[: n // 5] = rng.integers(40, 47, n // 5)
    base = np.datetime64("2026-01-01")
    secs = rng.integers(0, 86400, n)
    return pd.Series(base + days.astype("timedelta64[D]") + secs.astype("timedelta64[s]"))


def make_clean(n: int = 900, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    # Low-risk geographies and reversible channels only; amounts well away from $10k thresholds.
    country = rng.choice(["US", "GB", "DE", "CA", "AU"], n, p=[0.24, 0.22, 0.20, 0.18, 0.16])
    # Balanced channel mix so no single rail dominates (keeps the book genuinely "clean").
    channel = rng.choice(["Card", "ACH", "Wire", "Cheque"], n, p=[0.30, 0.28, 0.22, 0.20])
    kyc = rng.choice(["Tier 1", "Tier 2"], n, p=[0.75, 0.25])
    amount = rng.lognormal(5.2, 0.8, n).clip(5, 7000).round(2)  # capped below reporting limits
    df = pd.DataFrame(
        {
            "transaction_id": [f"TXC{i:06d}" for i in range(n)],
            "timestamp": _timestamps(rng, n),
            "amount": amount,
            "channel": channel,
            "country": country,
            "kyc_level": kyc,
            "is_fraud": 0,  # by construction: a clean book
        }
    )
    return df


def make_fraud(n: int = 900, seed: int = 11) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    country = rng.choice(["US", "GB", "RU", "KY", "AE"], n, p=[0.34, 0.18, 0.20, 0.16, 0.12])
    channel = rng.choice(["Card", "ACH", "Wire", "Crypto"], n, p=[0.34, 0.18, 0.26, 0.22])
    kyc = rng.choice(["Tier 1", "Tier 2", "Tier 3"], n, p=[0.45, 0.30, 0.25])
    amount = rng.lognormal(6.2, 1.0, n).clip(5, 50000).round(2)

    # Fraud propensity rises with risky geography, risky channel, weak KYC.
    geo_w = pd.Series(country).map({"US": 0.02, "GB": 0.03, "RU": 0.28, "KY": 0.30, "AE": 0.12}).to_numpy()
    ch_w = pd.Series(channel).map({"Card": 0.02, "ACH": 0.03, "Wire": 0.10, "Crypto": 0.22}).to_numpy()
    kyc_w = pd.Series(kyc).map({"Tier 1": 0.01, "Tier 2": 0.06, "Tier 3": 0.20}).to_numpy()
    p_fraud = np.clip(geo_w + ch_w + kyc_w - 0.05, 0.01, 0.9)
    is_fraud = (rng.random(n) < p_fraud).astype(int)

    df = pd.DataFrame(
        {
            "transaction_id": [f"TXF{i:06d}" for i in range(n)],
            "timestamp": _timestamps(rng, n, spike=True),
            "amount": amount,
            "channel": channel,
            "country": country,
            "kyc_level": kyc,
            "is_fraud": is_fraud,
        }
    )

    # —— Inject a deliberate STRUCTURING pattern: ~40 transfers parked just below $10,000 ——
    # (classic attempt to dodge the CTR reporting threshold), most of them flagged fraud.
    k = 40
    struct = pd.DataFrame(
        {
            "transaction_id": [f"TXF9{i:05d}" for i in range(k)],
            "timestamp": _timestamps(rng, k),
            "amount": rng.uniform(9100, 9950, k).round(2),
            "channel": rng.choice(["Wire", "Crypto"], k, p=[0.6, 0.4]),
            "country": rng.choice(["RU", "KY", "AE"], k),
            "kyc_level": rng.choice(["Tier 2", "Tier 3"], k),
            "is_fraud": (rng.random(k) < 0.8).astype(int),
        }
    )
    return pd.concat([df, struct], ignore_index=True)


def main() -> None:
    clean = make_clean()
    fraud = make_fraud()
    clean.to_csv(os.path.join(HERE, "clean_transactions.csv"), index=False)
    fraud.to_csv(os.path.join(HERE, "fraud_transactions.csv"), index=False)
    print(f"clean_transactions.csv  -> {len(clean):,} rows, fraud rate {clean['is_fraud'].mean():.2%}")
    print(f"fraud_transactions.csv  -> {len(fraud):,} rows, fraud rate {fraud['is_fraud'].mean():.2%}")
    # Quick structuring sanity check
    below = ((fraud["amount"] >= 9000) & (fraud["amount"] < 10000)).sum()
    above = ((fraud["amount"] >= 10000) & (fraud["amount"] < 11000)).sum()
    print(f"   structuring window: {below} just-below $10k vs {above} just-above")
    print("   fraud rate by country:")
    print(fraud.groupby("country")["is_fraud"].mean().round(3).to_string())


if __name__ == "__main__":
    main()
