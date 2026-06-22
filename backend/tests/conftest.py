"""Shared fixtures: a FastAPI test client and an uploaded sample dataset."""

import io
import os
import sys

# Tests always train on the fast synthetic set — never multi-GB local datasets.
os.environ["VERITA_FORCE_SYNTHETIC"] = "1"

# Tests are hermetic and offline: force the deterministic rule-based engines and never call a real
# LLM, even if a local .env defines GROQ_API_KEY / GEMINI_API_KEY. Setting these to "" before the
# app import means load_dotenv(override=False) won't repopulate them.
os.environ["GROQ_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(scope="session")
def sample_csv_bytes() -> bytes:
    """A deterministic FCC-style dataset with real signal (channel/geo drive amount & fraud)."""
    rng = np.random.default_rng(7)
    n = 1200
    ch_amt = {"Wire": 8.2, "SWIFT": 8.6, "Crypto": 7.8, "ACH": 6.4, "Card": 5.2}
    geo_risk = {"US": 0.02, "GB": 0.03, "DE": 0.03, "SG": 0.06, "AE": 0.12, "CN": 0.14, "KY": 0.30, "RU": 0.40}
    chans = list(ch_amt)
    geos = list(geo_risk)
    rows = []
    base = pd.Timestamp("2024-01-01")
    for i in range(n):
        ch = chans[rng.integers(0, len(chans))]
        geo = geos[rng.integers(0, len(geos))]
        day = int(rng.integers(0, 180))
        amt = round(float(np.exp(ch_amt[ch] + rng.normal(0, 1.4)) * (1 + day / 300)), 2)
        fraud = 1 if rng.random() < geo_risk[geo] * 0.25 else 0
        rows.append({
            "transaction_id": f"TX{i:06d}",
            "timestamp": (base + pd.Timedelta(days=day, hours=int(rng.integers(0, 24)))).strftime("%Y-%m-%d %H:%M"),
            "amount": amt,
            "channel": ch,
            "country": geo,
            "customer_segment": ["Retail", "SME", "HNW", "Corporate"][i % 4],
            "risk_score": int(min(100, 20 + geo_risk[geo] * 80 + np.log1p(amt) * 4)),
            "is_fraud": fraud,
        })
    df = pd.DataFrame(rows)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode()


@pytest.fixture(scope="session")
def dataset_id(client, sample_csv_bytes) -> str:
    resp = client.post(
        "/api/dashboard/generate",
        files={"file": ("Q3 Financial Analysis.csv", sample_csv_bytes, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["dataset_id"]
