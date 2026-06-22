"""
Verita — GenAI provider.

A thin, honest LLM layer with graceful degradation. Provider precedence:

    1. Groq      (GROQ_API_KEY)    — OpenAI-compatible, fast, used as the primary LLM.
    2. Gemini    (GEMINI_API_KEY)  — Google Generative Language REST API, used as a fallback.
    3. rule-based                  — deterministic engines, always available with zero credentials.

So the product is fully functional with no keys at all, an LLM is a genuine *enhancement* (never a
hidden dependency or a fake claim), and if the primary LLM is down/over-quota we fall back cleanly.
``mode()`` reports which path is active so the UI / health endpoint can state it truthfully.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger("verita.genai")

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


# ── key / mode helpers ───────────────────────────────────────────────────────

def _groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def _gemini_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def is_enabled() -> bool:
    """True if ANY real LLM is configured."""
    return bool(_groq_key() or _gemini_key())


def mode() -> str:
    if _groq_key():
        return "llm:groq"
    if _gemini_key():
        return "llm:gemini"
    return "rule-based"


# ── low-level callers ────────────────────────────────────────────────────────

def _call_groq(prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str | None:
    key = _groq_key()
    if not key:
        return None
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    try:
        import requests

        resp = requests.post(
            _GROQ_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=25,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning("Groq call failed: %s", e)
        return None


def _call_gemini(prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str | None:
    key = _gemini_key()
    if not key:
        return None
    # gemini-1.5-flash is retired; default to a current model. Override with GEMINI_MODEL.
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    try:
        import requests

        resp = requests.post(
            _GEMINI_URL.format(model=model),
            params={"key": key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
            },
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.warning("Gemini call failed: %s", e)
        return None


def _call_llm(prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str | None:
    """Call the best available LLM: Groq first, then Gemini. None if all fail / none configured."""
    out = _call_groq(prompt, max_tokens=max_tokens, temperature=temperature)
    if out:
        return out
    return _call_gemini(prompt, max_tokens=max_tokens, temperature=temperature)


# ── high-level tasks ─────────────────────────────────────────────────────────

def enhance_summary(facts: dict[str, Any], rule_based_summary: str) -> dict[str, str]:
    """
    Polish the executive summary. The LLM is given ONLY pre-computed facts (never raw rows) and is
    instructed not to invent numbers — so the output stays grounded in real statistics.
    """
    if not is_enabled():
        return {"summary": rule_based_summary, "mode": "rule-based"}

    prompt = (
        "You are a financial-compliance analyst. Using ONLY the JSON facts below, write a crisp "
        "3-4 sentence executive summary of this dataset for a compliance stakeholder. Do NOT invent "
        "any numbers or entities not present in the facts. Be specific and neutral.\n\n"
        f"FACTS:\n{json.dumps(facts, default=str)[:3000]}\n\n"
        f"A baseline summary (you may improve its prose, keep its numbers):\n{rule_based_summary}"
    )
    out = _call_llm(prompt, max_tokens=400)
    return {"summary": out or rule_based_summary, "mode": mode() if out else "rule-based"}


def translate_to_sql(question: str, schema: dict[str, list[str]], rule_based_sql: str) -> dict[str, str]:
    """
    Translate NL → SQL with the LLM when available; the rule-based SQL is passed as a hint and used
    as the fallback. We constrain it to a single read-only SELECT over the table `data`.
    """
    if not is_enabled():
        return {"sql": rule_based_sql, "mode": "rule-based"}

    temporals = schema.get("temporals", [])
    prompt = (
        "You translate a question into ONE read-only DuckDB SELECT over a table named `data`. "
        "Return ONLY the SQL — no prose, no markdown fences, no semicolons, no comments.\n"
        "Rules:\n"
        "- Use ONLY the columns listed below. Always double-quote column names.\n"
        "- Default to SELECT * (all columns) unless the user asks for specific columns or an aggregate.\n"
        "- DATE/TIMESTAMP columns are listed under 'dates'. To filter by month use "
        "monthname(\"col\") = 'May' OR extract(month from \"col\") = 5; to filter by year use "
        "extract(year from \"col\") = 2024. NEVER compare a date column directly to a month name "
        "string (e.g. \"onboarded\" = 'May' is WRONG).\n"
        "- Never write INSERT/UPDATE/DELETE/DROP or call file functions.\n\n"
        f"Columns by role:\n"
        f"  measures (numeric): {schema.get('measures', [])}\n"
        f"  dimensions (categorical): {schema.get('dimensions', [])}\n"
        f"  dates (date/timestamp): {temporals}\n\n"
        f"Question: {question}\n"
        f"A rule-based attempt to improve on: {rule_based_sql}"
    )
    out = _call_llm(prompt, max_tokens=300, temperature=0.0)
    if out:
        out = out.replace("```sql", "").replace("```", "").strip().rstrip(";")
        # Safety: only accept a SELECT/WITH; otherwise fall back to the trusted rule-based SQL.
        if out.lower().lstrip().startswith(("select", "with")):
            return {"sql": out, "mode": mode()}
    return {"sql": rule_based_sql, "mode": "rule-based"}
