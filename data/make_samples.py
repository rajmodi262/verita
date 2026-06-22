"""
Generate a handful of realistic demo datasets for Verita.
Deterministic (seeded) so the files are reproducible. Run:  python data/make_samples.py
Each dataset is shaped to make a different Verita feature shine.
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
HERE = os.path.dirname(os.path.abspath(__file__))


def save(df: pd.DataFrame, name: str) -> None:
    path = os.path.join(HERE, name)
    df.to_csv(path, index=False)
    print(f"  wrote {name:32s} {len(df):>6,} rows x {df.shape[1]} cols")


def daterange(start: str, periods: int, freq: str = "D") -> pd.DatetimeIndex:
    return pd.date_range(start, periods=periods, freq=freq)


# =====================================================================
# 1) AML ALERTS — engineered to trip the Investigator's typologies:
#    structuring (just under $10k), high-risk jurisdictions, a channel
#    that over-indexes on fraud, round amounts, and an August spike.
# =====================================================================
def make_aml_alerts(n: int = 3000) -> pd.DataFrame:
    low_risk = ["US", "GB", "DE", "SG", "CA", "AU", "FR", "NL"]
    high_risk = ["IR", "RU", "KP", "SY", "VE"]
    channels = ["Card", "ACH", "Wire", "Crypto", "Cash"]
    segments = ["Retail", "Corporate", "SME", "Private Wealth"]
    mcc = ["Retail", "Travel", "Crypto", "Financial Services", "Gaming", "Real Estate"]

    country = rng.choice(low_risk + high_risk, size=n, p=_probs(len(low_risk), len(high_risk)))
    channel = rng.choice(channels, size=n, p=[0.34, 0.22, 0.18, 0.16, 0.10])
    is_high = np.isin(country, high_risk)
    is_crypto = channel == "Crypto"

    # base amounts: log-normal; plus round-amount and structuring injections later
    amount = np.round(rng.lognormal(mean=6.2, sigma=1.1, size=n), 2)
    amount = np.clip(amount, 5, 95000)

    ts = rng.choice(daterange("2024-01-01", 366), size=n)
    ts = pd.to_datetime(ts)

    # fraud probability driven by real signals
    p = 0.02 + 0.25 * is_high + 0.12 * is_crypto + 0.08 * (amount > 20000)
    is_fraud = (rng.random(n) < np.clip(p, 0, 0.9)).astype(int)
    risk = np.clip(20 + 55 * is_fraud + rng.normal(0, 10, n) + 15 * is_high, 0, 100).round().astype(int)

    df = pd.DataFrame({
        "transaction_id": [f"TX{i:06d}" for i in range(n)],
        "timestamp": ts.strftime("%Y-%m-%d %H:00"),
        "amount": amount,
        "channel": channel,
        "country": country,
        "customer_segment": rng.choice(segments, n),
        "merchant_category": rng.choice(mcc, n),
        "risk_score": risk,
        "is_fraud": is_fraud,
    })

    # --- inject STRUCTURING: ~90 wires from a few customers, just under $10k ---
    struct = df.sample(90, random_state=1).index
    df.loc[struct, "amount"] = np.round(rng.uniform(9100, 9950, len(struct)), 2)
    df.loc[struct, "channel"] = "Wire"
    df.loc[struct, "is_fraud"] = 1
    df.loc[struct, "risk_score"] = rng.integers(78, 96, len(struct))

    # --- inject ROUND AMOUNTS (a laundering tell) ---
    rounds = df.sample(120, random_state=2).index
    df.loc[rounds, "amount"] = rng.choice([5000, 10000, 20000, 25000, 50000], len(rounds)).astype(float)

    # --- inject an AUGUST volume spike ---
    spike = df.sample(260, random_state=3).index
    df.loc[spike, "timestamp"] = pd.to_datetime(
        rng.choice(daterange("2024-08-01", 31), len(spike))
    ).strftime("%Y-%m-%d %H:00")

    return df.sort_values("timestamp").reset_index(drop=True)


def _probs(n_low: int, n_high: int):
    # low-risk countries common, high-risk rarer
    low = np.full(n_low, 0.85 / n_low)
    high = np.full(n_high, 0.15 / n_high)
    return np.concatenate([low, high])


# =====================================================================
# 2) RETAIL SALES (daily, 2 years) — for the forecast tournament and the
#    auto-dashboard: clear upward trend + weekly + yearly seasonality.
# =====================================================================
def make_retail_sales() -> pd.DataFrame:
    dates = daterange("2023-01-01", 731)  # 2 full years
    regions = ["North", "South", "East", "West"]
    cats = ["Apparel", "Electronics", "Home", "Grocery", "Beauty"]
    rows = []
    for d in dates:
        t = (d - dates[0]).days
        trend = 1.0 + 0.0007 * t                      # slow growth
        weekly = 1.25 if d.weekday() >= 5 else 1.0     # weekend bump
        yearly = 1.0 + 0.25 * np.sin(2 * np.pi * d.dayofyear / 365)
        holiday = 1.6 if (d.month == 12 and d.day >= 15) else 1.0
        for region in regions:
            for cat in cats:
                base = {"Apparel": 320, "Electronics": 540, "Home": 260, "Grocery": 700, "Beauty": 180}[cat]
                units = max(0, int(base * trend * weekly * yearly * holiday * rng.uniform(0.8, 1.2) / 10))
                price = {"Apparel": 45, "Electronics": 220, "Home": 60, "Grocery": 12, "Beauty": 28}[cat]
                rows.append({
                    "date": d.strftime("%Y-%m-%d"),
                    "region": region,
                    "category": cat,
                    "units_sold": units,
                    "revenue": round(units * price * rng.uniform(0.9, 1.1), 2),
                    "discount_pct": int(rng.choice([0, 0, 0, 5, 10, 15, 20])),
                    "returns": int(units * rng.uniform(0, 0.05)),
                })
    return pd.DataFrame(rows)


# =====================================================================
# 3) WIRE TRANSFERS — cross-border flows for the relationship/geo map.
# =====================================================================
def make_wire_transfers(n: int = 2200) -> pd.DataFrame:
    countries = ["US", "GB", "DE", "CH", "SG", "HK", "AE", "RU", "IR", "KY", "PA", "NG", "CN"]
    purposes = ["Trade settlement", "Intercompany", "Investment", "Salary", "Loan repayment", "Consulting"]
    banks = ["Atlas Bank", "Meridian Trust", "Northwind", "Coastal FCU", "Sterling Intl"]
    orig = rng.choice(countries, n)
    benef = rng.choice(countries, n)
    amt = np.round(rng.lognormal(9.5, 1.3, n), 2).clip(500, 5_000_000)
    risky = np.isin(orig, ["RU", "IR", "KY", "PA", "NG"]) | np.isin(benef, ["RU", "IR", "KY", "PA", "NG"])
    sar = ((rng.random(n) < (0.03 + 0.22 * risky + 0.05 * (amt > 1_000_000)))).astype(int)
    return pd.DataFrame({
        "wire_id": [f"W{i:06d}" for i in range(n)],
        "date": pd.to_datetime(rng.choice(daterange("2024-01-01", 366), n)).strftime("%Y-%m-%d"),
        "amount_usd": amt,
        "currency": rng.choice(["USD", "EUR", "GBP", "CHF", "AED"], n, p=[0.5, 0.2, 0.15, 0.1, 0.05]),
        "originator_country": orig,
        "beneficiary_country": benef,
        "purpose": rng.choice(purposes, n),
        "correspondent_bank": rng.choice(banks, n),
        "sar_filed": sar,
    })


# =====================================================================
# 4) CUSTOMER KYC — a customer table for profiling and quality scoring
#    (includes some missing values on purpose, to show the validation).
# =====================================================================
def make_customer_kyc(n: int = 1500) -> pd.DataFrame:
    countries = ["US", "GB", "DE", "SG", "CA", "AE", "RU", "IR", "NG", "BR"]
    segs = ["Retail", "SME", "Corporate", "Private Wealth"]
    tiers = ["Low", "Medium", "High"]
    df = pd.DataFrame({
        "customer_id": [f"C{i:05d}" for i in range(n)],
        "onboarded": pd.to_datetime(rng.choice(daterange("2019-01-01", 2190), n)).strftime("%Y-%m-%d"),
        "country": rng.choice(countries, n),
        "segment": rng.choice(segs, n, p=[0.55, 0.25, 0.15, 0.05]),
        "kyc_risk_tier": rng.choice(tiers, n, p=[0.6, 0.3, 0.1]),
        "pep": rng.choice([0, 1], n, p=[0.96, 0.04]),
        "sanctions_screen": rng.choice(["clear", "review", "hit"], n, p=[0.94, 0.05, 0.01]),
        "avg_monthly_volume": np.round(rng.lognormal(8.5, 1.2, n), 2),
        "account_balance": np.round(rng.lognormal(9.0, 1.4, n), 2),
        "products_held": rng.integers(1, 6, n),
    })
    # sprinkle some missing values so the data-quality score has something to say
    df.loc[df.sample(70, random_state=7).index, "avg_monthly_volume"] = np.nan
    df.loc[df.sample(40, random_state=8).index, "country"] = np.nan
    return df


# =====================================================================
# 5) CRYPTO EXCHANGE — a modern flavour: deposits/withdrawals/trades.
# =====================================================================
def make_crypto(n: int = 2500) -> pd.DataFrame:
    assets = ["BTC", "ETH", "USDT", "SOL", "XRP", "DOGE"]
    types = ["deposit", "withdraw", "trade"]
    kyc = ["none", "basic", "full"]
    src = rng.choice(["US", "GB", "DE", "SG", "RU", "IR", "NG", "VE", "KP"], n)
    amt = np.round(rng.lognormal(6.5, 1.5, n), 2).clip(1, 500_000)
    low_kyc = rng.choice(kyc, n, p=[0.2, 0.45, 0.35])
    risky = np.isin(src, ["RU", "IR", "NG", "VE", "KP"])
    flagged = ((rng.random(n) < (0.02 + 0.18 * risky + 0.15 * (low_kyc == "none") + 0.05 * (amt > 50000)))).astype(int)
    return pd.DataFrame({
        "txn_id": [f"CX{i:06d}" for i in range(n)],
        "timestamp": pd.to_datetime(rng.choice(daterange("2024-01-01", 366), n)).strftime("%Y-%m-%d %H:00"),
        "asset": rng.choice(assets, n),
        "type": rng.choice(types, n, p=[0.35, 0.30, 0.35]),
        "amount_usd": amt,
        "source_country": src,
        "kyc_level": low_kyc,
        "flagged": flagged,
    })


if __name__ == "__main__":
    print("Generating Verita demo datasets...")
    save(make_aml_alerts(),      "aml_alerts.csv")
    save(make_retail_sales(),    "retail_sales_daily.csv")
    save(make_wire_transfers(),  "wire_transfers.csv")
    save(make_customer_kyc(),    "customer_kyc.csv")
    save(make_crypto(),          "crypto_exchange.csv")
    print("Done. Drop any of these into Verita Studio.")
