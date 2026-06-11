"""Verita — SQLAlchemy ORM models for the audit trail."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisRun(Base):
    """One row per dataset uploaded + analyzed."""

    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(String(32), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255))
    row_count: Mapped[int] = mapped_column(Integer)
    column_count: Mapped[int] = mapped_column(Integer)
    quality_score: Mapped[float] = mapped_column(Float)
    quality_grade: Mapped[str] = mapped_column(String(2))
    insights_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def as_dict(self) -> dict:
        return {
            "id": self.id, "dataset_id": self.dataset_id, "filename": self.filename, "title": self.title,
            "row_count": self.row_count, "column_count": self.column_count,
            "quality_score": self.quality_score, "quality_grade": self.quality_grade,
            "insights_count": self.insights_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QueryLog(Base):
    """One row per SQL query executed against an uploaded dataset (compliance audit trail)."""

    __tablename__ = "query_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(String(32), index=True)
    sql: Mapped[str] = mapped_column(Text)
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    elapsed_ms: Mapped[float] = mapped_column(Float, default=0.0)
    mode: Mapped[str] = mapped_column(String(20), default="rule-based")
    ok: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def as_dict(self) -> dict:
        return {
            "id": self.id, "dataset_id": self.dataset_id, "sql": self.sql, "row_count": self.row_count,
            "elapsed_ms": self.elapsed_ms, "mode": self.mode, "ok": self.ok,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
