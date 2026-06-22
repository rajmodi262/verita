"""
SQL Router - read-only SQL over the uploaded dataset, powered by DuckDB.

HTTP adapter only:
POST /api/sql/query
POST /api/sql/translate
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.exceptions import DatasetNotFound, SqlExecutionError, SqlSafetyError
from ..services.sql_service import (
    FORBIDDEN_SQL as _FORBIDDEN,
    SQL_COMMENT as _COMMENT,
    run_query as svc_run_query,
    translate_question as svc_translate_question,
)

logger = logging.getLogger("verita.sql")
router = APIRouter()


class QueryRequest(BaseModel):
    dataset_id: str
    sql: str = Field(..., min_length=3, max_length=4000)


class TranslateRequest(BaseModel):
    dataset_id: str
    question: str = Field(..., min_length=3, max_length=500)


@router.post("/query")
def run_query(req: QueryRequest):
    try:
        return svc_run_query(req.dataset_id, req.sql)
    except DatasetNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (SqlSafetyError, SqlExecutionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - router returns a clean API error
        logger.exception("SQL query failed")
        raise HTTPException(status_code=500, detail=f"SQL service error: {exc}") from exc


@router.post("/translate")
def translate(req: TranslateRequest):
    try:
        return svc_translate_question(req.dataset_id, req.question)
    except DatasetNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - router returns a clean API error
        logger.exception("SQL translation failed")
        raise HTTPException(status_code=500, detail=f"SQL translation error: {exc}") from exc
