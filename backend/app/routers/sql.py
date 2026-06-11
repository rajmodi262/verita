"""
SQL Router — real SQL over the uploaded dataset, powered by DuckDB.

POST /api/sql/query      {dataset_id, sql}   → live results from the uploaded file
POST /api/sql/translate  {dataset_id, question} → suggested SQL from plain English

The uploaded DataFrame is registered as the table `data` (read-only) in an ephemeral
in-memory DuckDB connection per request — no persistence, no write surface.
"""

from __future__ import annotations

import logging
import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..profiling import store
from ..profiling.profiler import profile_dataframe

logger = logging.getLogger("verita.sql")
router = APIRouter()

_MAX_ROWS = 500
_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|attach|copy|export|install|load|pragma|set)\b", re.I
)


class QueryRequest(BaseModel):
    dataset_id: str
    sql: str = Field(..., min_length=3, max_length=4000)


class TranslateRequest(BaseModel):
    dataset_id: str
    question: str = Field(..., min_length=3, max_length=500)


@router.post("/query")
def run_query(req: QueryRequest):
    df = store.get(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found — upload a file first")

    sql = req.sql.strip().rstrip(";")
    if not re.match(r"^\s*(select|with)\b", sql, re.I):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
    if _FORBIDDEN.search(sql):
        raise HTTPException(status_code=400, detail="Only read-only SELECT queries are allowed")
    if ";" in sql:
        raise HTTPException(status_code=400, detail="Multi-statement queries are not allowed")

    import duckdb

    try:
        start = time.perf_counter()
        con = duckdb.connect(":memory:")
        con.register("data", df)
        result = con.execute(f"SELECT * FROM ({sql}) AS q LIMIT {_MAX_ROWS}").fetchdf()
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        con.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL error: {e}")

    # JSON-safe conversion
    result = result.astype(object).where(result.notna(), None)
    rows = result.to_dict(orient="records")
    for row in rows:
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
            elif hasattr(v, "item"):
                row[k] = v.item()

    return {
        "columns": list(result.columns),
        "rows": rows,
        "row_count": len(rows),
        "truncated": len(rows) >= _MAX_ROWS,
        "elapsed_ms": elapsed_ms,
    }


# ── plain-English → SQL (transparent rule-based translator) ──────────────────

_AGG_WORDS = {
    "average": "AVG", "avg": "AVG", "mean": "AVG",
    "total": "SUM", "sum": "SUM",
    "count": "COUNT", "number of": "COUNT", "how many": "COUNT",
    "max": "MAX", "maximum": "MAX", "highest": "MAX", "largest": "MAX",
    "min": "MIN", "minimum": "MIN", "lowest": "MIN", "smallest": "MIN",
}


@router.post("/translate")
def translate(req: TranslateRequest):
    """Heuristic NL→SQL: finds an aggregate, a measure, and a 'by <dimension>' grouping."""
    df = store.get(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found — upload a file first")

    profile = profile_dataframe(df.copy())
    q = req.question.lower()

    agg = next((sql_fn for word, sql_fn in _AGG_WORDS.items() if word in q), None)

    def _find_col(candidates: list[str]) -> str | None:
        for col in candidates:
            pattern = col.lower().replace("_", "[ _]?")
            if re.search(rf"\b{pattern}\b", q):
                return col
        return None

    measure = _find_col(profile.measures)
    dim = None
    by_match = re.search(r"\bby\s+([a-z_ ]+)", q)
    if by_match:
        dim = _find_col(profile.dimensions) or _find_col(profile.temporals)
    if dim is None:
        dim = _find_col(profile.dimensions)

    top_match = re.search(r"\btop\s+(\d+)", q)
    limit = int(top_match.group(1)) if top_match else (10 if dim else 100)

    if agg and measure and dim:
        sql = f'SELECT {dim}, {agg}({measure}) AS {agg.lower()}_{measure}\nFROM data\nGROUP BY {dim}\nORDER BY {agg.lower()}_{measure} DESC\nLIMIT {limit}'
    elif agg and measure:
        sql = f"SELECT {agg}({measure}) AS {agg.lower()}_{measure} FROM data"
    elif agg == "COUNT" and dim:
        sql = f"SELECT {dim}, COUNT(*) AS count FROM data GROUP BY {dim} ORDER BY count DESC LIMIT {limit}"
    elif measure:
        sql = f"SELECT * FROM data ORDER BY {measure} DESC LIMIT {limit}"
    else:
        sql = "SELECT * FROM data LIMIT 50"

    return {
        "sql": sql,
        "interpretation": {
            "aggregate": agg, "measure": measure, "dimension": dim, "limit": limit,
        },
        "note": "Rule-based translation — review before running.",
    }
