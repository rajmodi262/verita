"""
Verita — GenAI provider.

A thin, honest LLM layer. If GEMINI_API_KEY is set, Verita calls Google's Gemini REST API to
polish the executive summary and translate natural language to SQL. If no key is configured (the
default), the deterministic rule-based engines are used — so the product is fully functional with
zero credentials, and the LLM is a genuine *enhancement*, never a hidden dependency or a fake claim.

`mode()` reports which path is active so the UI/JD map can state it truthfully.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger("verita.genai")

_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def is_enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def mode() -> str:
    return "llm:gemini" if is_enabled() else "rule-based"


def _call_gemini(prompt: str, *, max_tokens: int = 512, temperature: float = 0.2) -> str | None:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    if not key:
        return None
    try:
        import requests

        resp = requests.post(
            _GEMINI_URL.format(model=model),
            params={"key": key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.warning("Gemini call failed, falling back to rule-based: %s", e)
        return None


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
    out = _call_gemini(prompt, max_tokens=400)
    return {"summary": out or rule_based_summary, "mode": "llm:gemini" if out else "rule-based"}


def translate_to_sql(question: str, schema: dict[str, list[str]], rule_based_sql: str) -> dict[str, str]:
    """
    Translate NL → SQL with the LLM when available; the rule-based SQL is passed as a hint and used
    as the fallback. We constrain it to a single read-only SELECT over the table `data`.
    """
    if not is_enabled():
        return {"sql": rule_based_sql, "mode": "rule-based"}

    prompt = (
        "Translate the user's question into a single read-only DuckDB SELECT over a table named "
        "`data`. Return ONLY the SQL, no prose, no code fences, no semicolons, no comments. "
        "Never write INSERT/UPDATE/DELETE/DROP or call file functions.\n\n"
        f"Columns: measures={schema.get('measures', [])}, dimensions={schema.get('dimensions', [])}, "
        f"temporal={schema.get('temporals', [])}.\n"
        f"Question: {question}\n"
        f"A rule-based attempt (improve if you can): {rule_based_sql}"
    )
    out = _call_gemini(prompt, max_tokens=300, temperature=0.0)
    if out:
        out = out.replace("```sql", "").replace("```", "").strip().rstrip(";")
        # Safety: only accept a SELECT/WITH; otherwise fall back.
        if out.lower().lstrip().startswith(("select", "with")):
            return {"sql": out, "mode": "llm:gemini"}
    return {"sql": rule_based_sql, "mode": "rule-based"}
