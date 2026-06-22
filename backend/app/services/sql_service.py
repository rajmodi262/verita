"""SQL playground service.

Provides a read-only DuckDB execution surface over an uploaded dataset plus the
transparent rule-based natural-language-to-SQL translator.
"""

from __future__ import annotations

import re
import time
from contextlib import contextmanager
from typing import Any, Iterator

import pandas as pd

from ..audit import record_query
from ..genai import provider as genai
from .datasets import require_dataset
from .exceptions import SqlExecutionError, SqlSafetyError

MAX_ROWS = 500

FORBIDDEN_SQL = re.compile(
    r"\b(insert|update|delete|drop|alter|create|attach|detach|copy|export|import|install|load|pragma|set|call|"
    r"read_csv|read_csv_auto|read_parquet|read_json|read_json_auto|read_text|read_blob|"
    r"parquet_scan|csv_scan|glob|sniff_csv|"
    r"sqlite_master|information_schema|pg_catalog|duckdb_\w+)\b",
    re.I,
)
SQL_COMMENT = re.compile(r"(--|/\*|\*/|#)")

AGG_WORDS = {
    "average": "AVG",
    "avg": "AVG",
    "mean": "AVG",
    "total": "SUM",
    "sum": "SUM",
    "count": "COUNT",
    "number of": "COUNT",
    "how many": "COUNT",
    "max": "MAX",
    "maximum": "MAX",
    "highest": "MAX",
    "largest": "MAX",
    "min": "MIN",
    "minimum": "MIN",
    "lowest": "MIN",
    "smallest": "MIN",
}


def guard_sql(sql: str) -> str:
    """Return normalized SQL if it is a single read-only SELECT/WITH query."""
    normalized = sql.strip().rstrip(";")
    if not re.match(r"^\s*(select|with)\b", normalized, re.I):
        raise SqlSafetyError("Only SELECT queries are allowed")
    if SQL_COMMENT.search(normalized):
        raise SqlSafetyError("SQL comments are not allowed")
    if FORBIDDEN_SQL.search(normalized):
        raise SqlSafetyError("Only read-only SELECT queries are allowed")
    if ";" in normalized:
        raise SqlSafetyError("Multi-statement queries are not allowed")
    return normalized


@contextmanager
def _readonly_duckdb(df: pd.DataFrame) -> Iterator[Any]:
    """Open a DuckDB connection with all file/network I/O disabled."""
    import duckdb

    con = duckdb.connect(":memory:", config={"enable_external_access": False})
    try:
        con.register("data", df)
        yield con
    finally:
        con.close()


def _json_safe_rows(result: pd.DataFrame) -> list[dict[str, Any]]:
    result = result.astype(object).where(result.notna(), None)
    rows = result.to_dict(orient="records")
    for row in rows:
        for key, value in row.items():
            if hasattr(value, "isoformat"):
                row[key] = value.isoformat()
            elif hasattr(value, "item"):
                row[key] = value.item()
    return rows


def run_query(dataset_id: str, sql: str) -> dict[str, Any]:
    """Execute guarded SQL against the dataset table named `data`."""
    df, _profile = require_dataset(dataset_id)
    normalized = guard_sql(sql)

    try:
        start = time.perf_counter()
        with _readonly_duckdb(df) as con:
            result = con.execute(f"SELECT * FROM ({normalized}) AS q LIMIT {MAX_ROWS}").fetchdf()
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    except Exception as exc:  # noqa: BLE001 - surface DuckDB failures as service errors
        record_query(dataset_id, normalized, 0, 0.0, ok=False)
        raise SqlExecutionError(f"SQL error: {exc}") from exc

    record_query(dataset_id, normalized, len(result), elapsed_ms, ok=True)
    rows = _json_safe_rows(result)
    return {
        "columns": list(result.columns),
        "rows": rows,
        "row_count": len(rows),
        "truncated": len(rows) >= MAX_ROWS,
        "elapsed_ms": elapsed_ms,
    }


# Words that imply a money/numeric measure even when the user doesn't say the exact column name.
MEASURE_SYNONYMS = (
    "spend", "spent", "spending", "revenue", "sales", "value", "cost", "price",
    "amount", "total", "volume", "balance", "turnover",
)
# Hints that a measure column is the "money" one, used to pick a sensible default.
_MONEY_HINTS = ("amount", "value", "revenue", "sales", "cost", "price", "total", "volume", "balance")

# Comparator phrases → SQL operator. Ordered so the two-word forms (>=, <=) win over the
# one-word forms (>, <) — otherwise "at least" would match "less than".
_COMPARATORS: list[tuple[str, str]] = [
    (r"(greater than or equal to|at least|no less than|minimum of|>=)", ">="),
    (r"(less than or equal to|at most|no more than|maximum of|<=)", "<="),
    (r"(greater than|more than|over|above|exceeding|exceeds|bigger than|>)", ">"),
    (r"(less than|under|below|fewer than|smaller than|<)", "<"),
    (r"(equal to|equals|exactly|is)", "="),
]
_FRAUD_WORDS = ("fraud", "fraudulent", "suspicious", "flagged", "anomal", "sar", "laundering")


def _find_col(question: str, candidates: list[str]) -> str | None:
    for col in candidates:
        pattern = re.escape(col.lower()).replace("_", r"[ _]?")
        # Trailing s? so a plural in the question ("channels") matches the column ("channel").
        if re.search(rf"\b{pattern}s?\b", question):
            return col
    return None


def _q(col: str) -> str:
    """Double-quote an identifier so column names with spaces/casing are safe."""
    return '"' + col.replace('"', '""') + '"'


def _pick_measure(q: str, profile) -> str | None:
    """Resolve the measure: an explicit column name first, else a money synonym → best money column."""
    explicit = _find_col(q, profile.measures)
    if explicit:
        return explicit
    if any(s in q for s in MEASURE_SYNONYMS):
        money = [c for c in profile.measures if any(h in c.lower() for h in _MONEY_HINTS)]
        return (money or profile.measures or [None])[0]
    return None


def _numeric_filter(q: str, target_col: str | None) -> str | None:
    """Detect 'over 5000' / 'at least 100' style numeric filters on the target (measure) column."""
    if not target_col:
        return None
    for phrase, op in _COMPARATORS:
        m = re.search(phrase + r"\s*\$?₹?\s*([\d][\d,]*\.?\d*)", q)
        if m:
            value = m.group(m.lastindex).replace(",", "")
            return f"{_q(target_col)} {op} {value}"
    return None


def _categorical_filter(q: str, df, profile) -> str | None:
    """Match a value token in the question against the distinct values of a dimension column.

    e.g. 'transactions in US' → "country" = 'US'. Bounded so we never scan a huge cardinality.
    """
    for col in (profile.geos + profile.dimensions):
        try:
            values = df[col].dropna().astype(str).unique()
        except Exception:
            continue
        if len(values) > 300:  # high-cardinality (IDs, free text) — skip, not worth scanning
            continue
        for v in values:
            v = str(v).strip()
            if len(v) < 2:
                continue
            if re.search(rf"(?<![\w]){re.escape(v.lower())}(?![\w])", q):
                return f"{_q(col)} = '{v.replace(chr(39), chr(39) * 2)}'"
    return None


def _fraud_filter(q: str, profile) -> str | None:
    """If the question mentions fraud and a boolean fraud flag exists, filter on it."""
    if not any(w in q for w in _FRAUD_WORDS):
        return None
    col = next(
        (b for b in profile.booleans if any(h in b.lower() for h in ("fraud", "anomal", "flag", "suspic", "sar"))),
        None,
    )
    return f"{_q(col)} = 1" if col else None


_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}


def _temporal_filter(q: str, profile) -> str | None:
    """Month / year filters on the first date column, using DuckDB date functions.

    "may month transactions" → monthname(date) = 'May'; "in 2024" → extract(year ...) = 2024.
    Date columns must be compared with date functions, never to a raw month-name string.
    """
    if not profile.temporals:
        return None
    tcol = profile.temporals[0]
    # Month — only trust it when "month" is nearby OR the bare month name is a standalone token,
    # to avoid matching the English verb "may"/"march".
    for name, num in _MONTHS.items():
        if re.search(rf"\b{name}\b\s+month|\bmonth\s+(?:of\s+)?{name}\b|\bin\s+{name}\b|\bfor\s+{name}\b", q):
            return f"extract(month from {_q(tcol)}) = {num}"
    # Year (4-digit 19xx/20xx).
    ym = re.search(r"\b(19|20)\d{2}\b", q)
    if ym:
        return f"extract(year from {_q(tcol)}) = {ym.group(0)}"
    return None


def _rule_based_sql(q: str, df, profile) -> tuple[str, dict[str, Any]]:
    """Deterministic NL→SQL. Returns (sql, interpretation). Works fully offline (no LLM)."""
    agg = next((fn for word, fn in AGG_WORDS.items() if word in q), None)
    measure = _pick_measure(q, profile)

    # Dimension to group by — prefer one named right after "by", else any mentioned dimension.
    dim = None
    if re.search(r"\b(by|per|for each|grouped by|across)\b", q):
        dim = _find_col(q, profile.dimensions) or _find_col(q, profile.geos) or _find_col(q, profile.temporals)
    if dim is None:
        dim = _find_col(q, profile.dimensions) or _find_col(q, profile.geos)

    # Filters (WHERE) — numeric on the measure, a categorical value, and/or a fraud flag.
    # For a bare "over 5000" with no named measure, default to the best money column.
    money_measure = next(
        (c for c in profile.measures if any(h in c.lower() for h in _MONEY_HINTS)),
        (profile.measures[0] if profile.measures else None),
    )
    num_target = measure or money_measure
    wheres = [
        f for f in (
            _numeric_filter(q, num_target),
            _categorical_filter(q, df, profile),
            _fraud_filter(q, profile),
            _temporal_filter(q, profile),
        ) if f
    ]
    where_sql = (" WHERE " + " AND ".join(wheres)) if wheres else ""

    # LIMIT — accept "top 15", "15 top", "first 10", and "15 transactions/rows/records".
    lim = (
        re.search(r"\b(?:top|first|last|bottom|show|limit|give me|return)\s+(\d+)\b", q)
        or re.search(r"\b(\d+)\s+(?:top|transactions|rows|records|results|entries|txns|trades|payments)\b", q)
    )
    explicit_limit = lim is not None
    limit = int(lim.group(1)) if lim else (10 if dim else 100)

    # A superlative ("top/highest/largest") with no named measure → order by the money column,
    # so "15 top transactions" becomes "ORDER BY amount DESC LIMIT 15" instead of a bare SELECT *.
    superlative = bool(re.search(r"\b(top|highest|largest|biggest|most|maximum|max|dearest)\b", q))
    order_measure = measure or (money_measure if superlative else None)

    # Build the SELECT. COUNT is handled first so it always means COUNT(*) rows — a named
    # measure in a "count ..." question is the filter target, not the thing being counted.
    if agg == "COUNT" and dim:
        sql = (f"SELECT {_q(dim)}, COUNT(*) AS count\nFROM data{where_sql}\n"
               f"GROUP BY {_q(dim)}\nORDER BY count DESC\nLIMIT {limit}")
    elif agg == "COUNT":
        # "how many transactions [where ...]" → a real count, not SELECT *.
        sql = f"SELECT COUNT(*) AS count\nFROM data{where_sql}"
    elif agg and measure and dim:
        alias = f"{agg.lower()}_{measure}".lower().replace(" ", "_")
        sql = (f"SELECT {_q(dim)}, {agg}({_q(measure)}) AS {_q(alias)}\nFROM data{where_sql}\n"
               f"GROUP BY {_q(dim)}\nORDER BY {_q(alias)} DESC\nLIMIT {limit}")
    elif agg and measure:
        alias = f"{agg.lower()}_{measure}".lower().replace(" ", "_")
        sql = f"SELECT {agg}({_q(measure)}) AS {_q(alias)}\nFROM data{where_sql}"
    elif order_measure:
        # "top 15 transactions", "highest amounts", "transactions over 1000 sorted by amount".
        sql = f"SELECT *\nFROM data{where_sql}\nORDER BY {_q(order_measure)} DESC\nLIMIT {limit}"
    elif where_sql:
        # No measure/agg but the user asked for specific rows (e.g. "transactions in US").
        sql = f"SELECT *\nFROM data{where_sql}\nLIMIT {limit}"
    elif explicit_limit:
        # A plain "show me 15 transactions" — honour the requested row count.
        sql = f"SELECT *\nFROM data\nLIMIT {limit}"
    else:
        sql = "SELECT * FROM data LIMIT 50"

    interp = {"aggregate": agg, "measure": measure, "dimension": dim, "limit": limit,
              "filters": wheres}
    return sql, interp


def translate_question(dataset_id: str, question: str) -> dict[str, Any]:
    """Translate a plain-English question into guarded SQL (LLM if configured, else rule-based)."""
    df, profile = require_dataset(dataset_id)
    q = question.lower().strip()

    sql, interp = _rule_based_sql(q, df, profile)

    enhanced = genai.translate_to_sql(
        question,
        {
            "measures": profile.measures,
            "dimensions": profile.dimensions + profile.geos,
            "temporals": profile.temporals,
        },
        sql,
    )
    final_sql = enhanced["sql"]
    mode = enhanced["mode"]
    try:
        final_sql = guard_sql(final_sql)
    except SqlSafetyError:
        # The LLM produced something unsafe — fall back to the trusted rule-based SQL.
        final_sql, mode = sql, "rule-based"

    return {
        "sql": final_sql,
        "mode": mode,
        "interpretation": {
            "aggregate": interp["aggregate"],
            "measure": interp["measure"],
            "dimension": interp["dimension"],
            "limit": interp["limit"],
        },
        "note": (
            f"{'LLM-assisted' if mode.startswith('llm') else 'Rule-based'} translation"
            + (f" · filters: {', '.join(interp['filters'])}" if interp["filters"] else "")
            + " — review before running."
        ),
    }
