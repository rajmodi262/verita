"""
Verita — Compliance NLP Analyzer.

Analyzes unstructured compliance text (transaction narratives, alerts, regulatory notes) and returns:
  • extracted entities (money, jurisdictions, accounts, SWIFT codes, dates, percentages)
  • regulatory keyword matches grouped by framework (BSA / AML / OFAC / FinCEN)
  • a transparent risk classification with the exact signals that drove it
  • a recommended action (File SAR / Investigate / Monitor / No action)

Deliberately dependency-light: regex + curated keyword libraries, so it runs instantly with no
model download. Every score is explainable — no black box. (An LLM could later enrich the
narrative summary; the structured analysis here is the honest core.)
"""

from __future__ import annotations

import re
from typing import Any

# ── Regulatory keyword libraries ────────────────────────────────────────────
RULE_LIBRARIES: dict[str, list[str]] = {
    "BSA": ["structuring", "smurfing", "currency transaction report", "ctr", "cash intensive",
            "monetary instrument", "record keeping", "$10,000", "10000"],
    "AML": ["money laundering", "layering", "placement", "integration", "shell company", "nominee",
            "hawala", "trade-based", "front company", "proceeds of crime", "illicit funds",
            "beneficial owner", "funnel account", "round-tripping"],
    "OFAC": ["sanctions", "sanctioned", "sdn list", "embargo", "blocked person", "specially designated",
             "restricted party", "prohibited transaction", "designated"],
    "FinCEN": ["sar", "suspicious activity report", "fincen", "msb", "money services business",
               "cdd", "customer due diligence", "edd", "enhanced due diligence", "pep",
               "politically exposed"],
}

# High-risk jurisdictions (FATF / OFAC-adjacent) — name and code forms.
HIGH_RISK_JURISDICTIONS = {
    "iran", "north korea", "syria", "cuba", "russia", "venezuela", "myanmar", "afghanistan",
    "cayman islands", "seychelles", "panama", "ir", "kp", "sy", "cu", "ru", "ve",
}

STRUCTURING_PATTERNS = [
    r"\bjust under\b", r"\bbelow the (?:reporting )?threshold\b", r"\bmultiple (?:small )?(?:deposits|transfers|transactions)\b",
    r"\bbroke[n]? (?:up|down) into\b", r"\bto avoid (?:reporting|detection|the threshold)\b",
]

# ── Entity patterns ─────────────────────────────────────────────────────────
MONEY_RE = re.compile(r"\$\s?[\d,]+(?:\.\d{2})?|\b(?:USD|EUR|GBP)\s?[\d,]+(?:\.\d{2})?", re.I)
SWIFT_RE = re.compile(r"\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b")
ACCOUNT_RE = re.compile(r"\b\d{8,20}\b")
PERCENT_RE = re.compile(r"\b\d+(?:\.\d+)?\s?%")
DATE_RE = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b")

COUNTRY_RE = re.compile(
    r"\b(?:United States|USA|Iran|North Korea|Syria|Cuba|Russia|Venezuela|Myanmar|Afghanistan|"
    r"Cayman Islands|Seychelles|Panama|Switzerland|Singapore|Hong Kong|UAE|Nigeria|China|"
    r"Germany|United Kingdom|UK)\b",
    re.I,
)


def _extract_entities(text: str) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()

    def add(label: str, m: re.Match):
        key = (m.start(), m.end())
        if key not in seen:
            seen.add(key)
            found.append({"text": m.group(), "label": label, "start": m.start(), "end": m.end()})

    for m in MONEY_RE.finditer(text):
        add("MONEY", m)
    for m in COUNTRY_RE.finditer(text):
        add("JURISDICTION", m)
    for m in SWIFT_RE.finditer(text):
        add("SWIFT_CODE", m)
    for m in PERCENT_RE.finditer(text):
        add("PERCENT", m)
    for m in DATE_RE.finditer(text):
        add("DATE", m)
    for m in ACCOUNT_RE.finditer(text):
        if not any(e["start"] <= m.start() < e["end"] for e in found):  # not part of money/date
            add("ACCOUNT", m)

    return sorted(found, key=lambda e: e["start"])


def _match_regulations(text_lower: str) -> list[dict[str, str]]:
    matches = []
    for framework, keywords in RULE_LIBRARIES.items():
        for kw in keywords:
            idx = text_lower.find(kw.lower())
            if idx >= 0:
                start = max(0, idx - 40)
                end = min(len(text_lower), idx + len(kw) + 40)
                matches.append({"framework": framework, "keyword": kw, "context": text_lower[start:end].strip()})
    return matches


def analyze(text: str) -> dict[str, Any]:
    text_lower = text.lower()
    entities = _extract_entities(text)
    matches = _match_regulations(text_lower)

    # ── transparent risk scoring ──
    signals: list[str] = []
    score = 0.0

    framework_hits = {f: sum(1 for m in matches if m["framework"] == f) for f in RULE_LIBRARIES}
    if framework_hits["OFAC"]:
        score += 28 + 6 * framework_hits["OFAC"]; signals.append(f"{framework_hits['OFAC']} OFAC/sanctions term(s)")
    if framework_hits["AML"]:
        score += 18 + 5 * framework_hits["AML"]; signals.append(f"{framework_hits['AML']} AML term(s)")
    if framework_hits["BSA"]:
        score += 12 + 4 * framework_hits["BSA"]; signals.append(f"{framework_hits['BSA']} BSA term(s)")
    if framework_hits["FinCEN"]:
        score += 8 + 3 * framework_hits["FinCEN"]; signals.append(f"{framework_hits['FinCEN']} FinCEN term(s)")

    geos = {e["text"].lower() for e in entities if e["label"] == "JURISDICTION"}
    risky = [g for g in geos if g in HIGH_RISK_JURISDICTIONS]
    if risky:
        score += 22 + 8 * len(risky); signals.append(f"High-risk jurisdiction: {', '.join(sorted(risky))}")

    structuring = [p for p in STRUCTURING_PATTERNS if re.search(p, text_lower)]
    if structuring:
        score += 30; signals.append("Possible structuring language detected")

    if "pep" in text_lower or "politically exposed" in text_lower:
        score += 15; signals.append("Politically Exposed Person (PEP) reference")

    if any(e["label"] == "MONEY" for e in entities):
        signals.append("Monetary amount(s) present")

    score = min(100.0, round(score, 1))
    level = "Critical" if score >= 75 else "High" if score >= 50 else "Medium" if score >= 25 else "Low"
    action = (
        "File SAR" if score >= 75
        else "Investigate" if score >= 50
        else "Enhanced Monitoring" if score >= 25
        else "No action required"
    )

    return {
        "risk_score": score,
        "risk_level": level,
        "recommended_action": action,
        "signals": signals or ["No material compliance signals detected"],
        "entities": entities,
        "regulatory_matches": matches,
        "framework_hits": framework_hits,
        "summary": {
            "entity_count": len(entities),
            "regulation_matches": len(matches),
            "text_length": len(text),
        },
    }
