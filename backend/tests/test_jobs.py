"""Tests for the in-process background job runner."""

import time

import pytest

from app.services import jobs
from app.services.exceptions import JobNotFound


def _wait_for(job_id, statuses, timeout=5.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = jobs.get_job(job_id)["status"]
        if status in statuses:
            return status
        time.sleep(0.02)
    return jobs.get_job(job_id)["status"]


def test_job_as_dict_roundtrip():
    job = jobs.Job(id="abc123", kind="dashboard_ingestion", filename="f.csv")
    d = job.as_dict()
    assert d["job_id"] == "abc123"
    assert d["status"] == "queued"
    assert d["progress"] == 0
    assert d["filename"] == "f.csv"


def test_get_job_unknown_raises():
    with pytest.raises(JobNotFound):
        jobs.get_job("does-not-exist")


def test_patch_and_append_step_update_job():
    jobs._jobs["patch1"] = jobs.Job(id="patch1", kind="k", filename="f")
    jobs._patch("patch1", status="running", progress=10)
    jobs._append_step("patch1", "step one", 25)
    out = jobs.get_job("patch1")
    assert out["status"] == "running"
    assert out["progress"] == 25          # max(10, 25)
    assert "step one" in out["steps"]


def test_create_job_runs_to_success(monkeypatch):
    monkeypatch.setattr(jobs, "generate_dashboard", lambda filename, raw: {"ok": True})
    created = jobs.create_dashboard_job("data.csv", b"col\n1\n")
    assert "job_id" in created
    assert _wait_for(created["job_id"], {"succeeded", "failed"}) == "succeeded"
    assert jobs.get_job(created["job_id"])["result"] == {"ok": True}


def test_create_job_records_failure(monkeypatch):
    def _boom(filename, raw):
        raise ValueError("bad file")

    monkeypatch.setattr(jobs, "generate_dashboard", _boom)
    created = jobs.create_dashboard_job("data.csv", b"x")
    assert _wait_for(created["job_id"], {"succeeded", "failed"}) == "failed"
    assert "bad file" in jobs.get_job(created["job_id"])["error"]
