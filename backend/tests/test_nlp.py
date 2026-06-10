"""Tests for the compliance NLP analyzer."""

from app.nlp.analyzer import analyze


def test_high_risk_text_recommends_sar():
    text = (
        "Subject wired $48,500 via SWIFT to a shell company in Russia, structured as multiple "
        "small transfers just under the reporting threshold to avoid detection. Subject is a PEP."
    )
    r = analyze(text)
    assert r["risk_level"] in ("High", "Critical")
    assert r["recommended_action"] in ("File SAR", "Investigate")
    labels = {e["label"] for e in r["entities"]}
    assert "MONEY" in labels and "JURISDICTION" in labels
    assert any(m["framework"] == "AML" for m in r["regulatory_matches"])


def test_benign_text_is_low_risk():
    r = analyze("Customer paid $42.00 for a monthly subscription via card. Routine domestic payment.")
    assert r["risk_level"] == "Low"
    assert r["recommended_action"] == "No action required"


def test_structuring_language_is_flagged():
    r = analyze("The client broke up the deposit into amounts just under $10,000 to avoid reporting.")
    assert any("structuring" in s.lower() for s in r["signals"])


def test_score_is_bounded():
    r = analyze("sanctions OFAC money laundering structuring Iran Russia PEP shell company hawala")
    assert 0 <= r["risk_score"] <= 100
