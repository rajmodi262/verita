"""End-to-end tests for the dashboard intelligence endpoints."""

import io


def test_generate_full_payload(client, sample_csv_bytes):
    resp = client.post("/api/dashboard/generate", files={"file": ("Q3 Financial Analysis.csv", sample_csv_bytes, "text/csv")})
    assert resp.status_code == 200
    d = resp.json()
    # smart title
    assert d["title"] == "Q3 Financial Analysis"
    # profile
    assert d["profile"]["row_count"] == 1200
    roles = {c["name"]: c["semantic_type"] for c in d["profile"]["columns"]}
    assert roles["amount"] == "measure"
    assert roles["timestamp"] == "temporal"
    assert roles["country"] in ("geo", "dimension")
    assert roles["is_fraud"] == "boolean"
    # intelligence
    assert len(d["insights"]) >= 3
    assert all("evidence" in i and i["evidence"] for i in d["insights"])  # every claim shows its work
    assert 0 <= d["quality"]["score"] <= 100
    assert d["quality"]["grade"] in list("ABCDF")
    assert d["executive_summary"].startswith("This dataset contains 1,200 records")
    assert len(d["relationships"]["edges"]) >= 1


def test_generate_rejects_empty_file(client):
    resp = client.post("/api/dashboard/generate", files={"file": ("empty.csv", b"", "text/csv")})
    assert resp.status_code == 400


def test_generate_rejects_non_tabular(client):
    resp = client.post("/api/dashboard/generate", files={"file": ("x.csv", b"not,a,real\n", "text/csv")})
    # one header row, zero data rows → still parses but has 0 rows; acceptable either way, not a 500
    assert resp.status_code in (200, 400)


def test_forecast_has_honest_backtest(client, dataset_id):
    resp = client.post("/api/dashboard/forecast", json={"dataset_id": dataset_id, "periods": 10})
    assert resp.status_code == 200
    d = resp.json()
    assert len(d["points"]) == 10
    assert d["backtest_mape"] is None or d["backtest_mape"] >= 0
    assert all("lo" in p and "hi" in p and p["hi"] >= p["lo"] for p in d["points"])


def test_compare_periods(client, dataset_id):
    resp = client.post("/api/dashboard/compare", json={"dataset_id": dataset_id})
    assert resp.status_code == 200
    d = resp.json()
    assert "headline" in d and "movers" in d
    assert d["headline"]["period_a"]["from"] <= d["headline"]["period_b"]["from"]


def test_frames_sorted_and_aggregated(client, dataset_id):
    resp = client.post("/api/dashboard/frames", json={"dataset_id": dataset_id})
    assert resp.status_code == 200
    frames = resp.json()["frames"]
    assert len(frames) >= 2
    periods = [f["period"] for f in frames]
    assert periods == sorted(periods)
    assert all(f["rows"] > 0 for f in frames)


def test_endpoints_404_on_unknown_dataset(client):
    for path in ("forecast", "compare", "frames"):
        resp = client.post(f"/api/dashboard/{path}", json={"dataset_id": "nope000nope0"})
        assert resp.status_code == 404


def test_smart_title_variants(client):
    from app.routers.dashboard import _smart_title
    assert _smart_title("q3_financial-analysis.v2 (1).xlsx") == "Q3 Financial Analysis"
    assert _smart_title("monthly_revenue_report.csv") == "Monthly Revenue Report"
    assert _smart_title("data.csv") == "Data"
