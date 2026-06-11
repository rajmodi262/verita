"""Tests for the security middleware: API-key auth, rate limiting, and error envelopes."""

import importlib

import pytest
from fastapi.testclient import TestClient


def _fresh_app(monkeypatch, **env):
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    import app.main as main
    importlib.reload(main)
    return main.app


def test_health_open_without_key(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"
    assert r.json()["auth"] == "open"


def test_api_key_enforced_when_set(monkeypatch):
    app = _fresh_app(monkeypatch, VERITA_API_KEY="s3cr3t")
    c = TestClient(app)
    # health stays open
    assert c.get("/api/health").status_code == 200
    # protected endpoint without key → 401
    r = c.post("/api/nlp/analyze", json={"text": "test"})
    assert r.status_code == 401
    assert r.json()["error"] == "unauthorized"
    # with correct key → 200
    r = c.post("/api/nlp/analyze", json={"text": "test"}, headers={"X-API-Key": "s3cr3t"})
    assert r.status_code == 200
    monkeypatch.delenv("VERITA_API_KEY", raising=False)
    importlib.reload(__import__("app.main", fromlist=["app"]))  # restore


def test_rate_limit_triggers(monkeypatch):
    app = _fresh_app(monkeypatch, VERITA_RATE_LIMIT="5", VERITA_RATE_WINDOW="60")
    c = TestClient(app)
    codes = [c.post("/api/nlp/analyze", json={"text": "hi there"}).status_code for _ in range(8)]
    assert 429 in codes  # at least one request got limited
    assert codes.count(200) <= 5
    monkeypatch.delenv("VERITA_RATE_LIMIT", raising=False)
    monkeypatch.delenv("VERITA_RATE_WINDOW", raising=False)
    importlib.reload(__import__("app.main", fromlist=["app"]))


def test_validation_error_is_clean_json(client):
    # text below min_length → 422 with a structured body, never a stack trace
    r = client.post("/api/nlp/analyze", json={"text": ""})
    assert r.status_code == 422
    assert "detail" in r.json()
