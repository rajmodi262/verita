"""
Verita — audit-trail writes (best-effort).

Persistence must never take down the analysis path: every write is wrapped so a database
outage degrades to a log line, not a 500. Reads raise normally — if you ask for history
and the DB is down, you deserve the real error.
"""

from __future__ import annotations

import logging

logger = logging.getLogger("verita.audit")


def record_analysis(dataset_id: str, filename: str, title: str, row_count: int,
                    column_count: int, quality_score: float, quality_grade: str,
                    insights_count: int) -> None:
    try:
        from .db import SessionLocal
        from .models_db import AnalysisRun

        with SessionLocal() as session:
            session.add(AnalysisRun(
                dataset_id=dataset_id, filename=filename, title=title,
                row_count=row_count, column_count=column_count,
                quality_score=quality_score, quality_grade=quality_grade,
                insights_count=insights_count,
            ))
            session.commit()
    except Exception as e:
        logger.warning("audit: could not record analysis run: %s", e)


def record_query(dataset_id: str, sql: str, row_count: int, elapsed_ms: float,
                 mode: str = "manual", ok: bool = True) -> None:
    try:
        from .db import SessionLocal
        from .models_db import QueryLog

        with SessionLocal() as session:
            session.add(QueryLog(
                dataset_id=dataset_id, sql=sql[:4000], row_count=row_count,
                elapsed_ms=elapsed_ms, mode=mode, ok=ok,
            ))
            session.commit()
    except Exception as e:
        logger.warning("audit: could not record query: %s", e)
