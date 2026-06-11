"""Tests for the Auditable Compliance Investigator."""

import pandas as pd

from app.agent.investigator import investigate, verify_chain
from app.profiling.profiler import profile_dataframe


def _frame(client, sample_csv_bytes):
    import io
    return pd.read_csv(io.BytesIO(sample_csv_bytes))


def test_investigation_runs_real_tests(sample_csv_bytes):
    import io
    df = pd.read_csv(io.BytesIO(sample_csv_bytes))
    prof = profile_dataframe(df.copy())
    res = investigate(df, prof, title="t")

    assert res["risk_level"] in ("Low", "Medium", "High", "Critical")
    assert res["tests_run"] >= 3
    # every non-summary test step carries the real SQL it ran
    tested = [s for s in res["trace"] if s["id"] not in ("baseline", "synthesis")]
    assert all(s["query"] for s in tested)
    # baseline first, synthesis last
    assert res["trace"][0]["id"] == "baseline"
    assert res["trace"][-1]["id"] == "synthesis"


def test_chain_is_valid_and_contiguous(sample_csv_bytes):
    import io
    df = pd.read_csv(io.BytesIO(sample_csv_bytes))
    res = investigate(df, profile_dataframe(df.copy()), title="t")
    trace, chain = res["trace"], res["chain"]
    assert chain["verified"] is True
    assert chain["length"] == len(trace)
    assert verify_chain(trace) is True
    # each step folds in the previous hash
    for i in range(1, len(trace)):
        assert trace[i]["prev_hash"] == trace[i - 1]["hash"]


def test_tampering_breaks_the_chain(sample_csv_bytes):
    import io
    df = pd.read_csv(io.BytesIO(sample_csv_bytes))
    res = investigate(df, profile_dataframe(df.copy()), title="t")
    trace = res["trace"]
    # doctor a finding after the fact — verification must fail
    trace[1]["finding"] = "Nothing suspicious (doctored)."
    assert verify_chain(trace) is False


def test_findings_cite_evidence(sample_csv_bytes):
    import io
    df = pd.read_csv(io.BytesIO(sample_csv_bytes))
    res = investigate(df, profile_dataframe(df.copy()), title="t")
    assert "COMPLIANCE INVESTIGATION MEMO" in res["memo"] or res["memo_mode"] == "llm:gemini"
    confirmed = [s for s in res["trace"] if s["confirmed"] and s["id"] not in ("baseline", "synthesis")]
    assert all(s["finding"] for s in confirmed)


def test_investigate_endpoint(client, sample_csv_bytes):
    up = client.post("/api/dashboard/generate", files={"file": ("sample.csv", sample_csv_bytes, "text/csv")})
    dsid = up.json()["dataset_id"]
    r = client.post("/api/agent/investigate", json={"dataset_id": dsid})
    assert r.status_code == 200
    body = r.json()
    assert body["chain"]["verified"] is True
    assert body["tests_run"] >= 3


def test_investigate_unknown_dataset_404(client):
    r = client.post("/api/agent/investigate", json={"dataset_id": "nope"})
    assert r.status_code == 404
