"""Tests for the GenAI provider — keyless fallback and a mocked LLM path."""

import app.genai.provider as genai


def test_disabled_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert genai.is_enabled() is False
    assert genai.mode() == "rule-based"
    # summary/SQL pass through unchanged
    assert genai.enhance_summary({"rows": 10}, "baseline") == {"summary": "baseline", "mode": "rule-based"}
    out = genai.translate_to_sql("avg amount", {"measures": ["amount"]}, "SELECT 1")
    assert out == {"sql": "SELECT 1", "mode": "rule-based"}


def test_enabled_uses_llm_when_key_present(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    assert genai.is_enabled() is True
    assert genai.mode() == "llm:gemini"
    # mock the network call
    monkeypatch.setattr(genai, "_call_gemini", lambda *a, **k: "SELECT channel, AVG(amount) FROM data GROUP BY channel")
    out = genai.translate_to_sql("avg amount by channel", {"measures": ["amount"], "dimensions": ["channel"]}, "SELECT 1")
    assert out["mode"] == "llm:gemini"
    assert "GROUP BY channel" in out["sql"]


def test_unsafe_llm_output_is_rejected(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr(genai, "_call_gemini", lambda *a, **k: "DROP TABLE data")
    out = genai.translate_to_sql("delete everything", {"measures": []}, "SELECT 1")
    # non-SELECT LLM output must fall back to the rule-based SQL
    assert out == {"sql": "SELECT 1", "mode": "rule-based"}


def test_llm_failure_falls_back(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr(genai, "_call_gemini", lambda *a, **k: None)  # simulate API failure
    assert genai.enhance_summary({}, "baseline")["summary"] == "baseline"
