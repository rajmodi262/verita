"""Tests for the relational audit trail (SQLAlchemy — SQLite in tests, Postgres in compose)."""

import os
import tempfile

import pytest


@pytest.fixture()
def fresh_db(monkeypatch):
    """Isolated SQLite database per test, injected before the app modules bind a session."""
    tmp = tempfile.mkdtemp()
    url = f"sqlite:///{os.path.join(tmp, 'test_verita.db')}"

    # Rebind the engine/session the modules use.
    import app.db as db
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(db, "SessionLocal", sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True))

    from app import models_db  # noqa: F401

    db.Base.metadata.create_all(engine)
    return db


def test_record_and_read_analysis(fresh_db):
    from app.audit import record_analysis
    from app.models_db import AnalysisRun
    from sqlalchemy import select

    record_analysis(
        dataset_id="abc123", filename="q3.csv", title="Q3 Financial Analysis",
        row_count=2400, column_count=9, quality_score=96.0, quality_grade="A", insights_count=6,
    )
    with fresh_db.SessionLocal() as s:
        rows = s.scalars(select(AnalysisRun)).all()
    assert len(rows) == 1
    d = rows[0].as_dict()
    assert d["title"] == "Q3 Financial Analysis"
    assert d["quality_grade"] == "A"
    assert d["row_count"] == 2400
    assert d["created_at"] is not None


def test_record_query_truncates_and_flags(fresh_db):
    from app.audit import record_query
    from app.models_db import QueryLog
    from sqlalchemy import select

    record_query("abc123", "SELECT 1", 1, 3.2, ok=True)
    record_query("abc123", "SELECT * FROM nope", 0, 0.0, ok=False)
    with fresh_db.SessionLocal() as s:
        rows = s.scalars(select(QueryLog).order_by(QueryLog.id)).all()
    assert len(rows) == 2
    assert rows[0].ok is True and rows[1].ok is False


def test_audit_write_failure_is_silent(monkeypatch):
    """A dead database must never break the analysis path — writes are best-effort."""
    import app.audit as audit

    def boom():  # SessionLocal that explodes on use
        raise RuntimeError("db down")

    import app.db as db
    monkeypatch.setattr(db, "SessionLocal", boom)
    # Must not raise:
    audit.record_analysis("x", "f.csv", "T", 1, 1, 50.0, "C", 0)
    audit.record_query("x", "SELECT 1", 0, 0.0)


def test_history_endpoints(fresh_db, client):
    from app.audit import record_analysis, record_query

    record_analysis("ds1", "a.csv", "A", 10, 3, 90.0, "A", 2)
    record_query("ds1", "SELECT 1", 1, 1.0)

    r = client.get("/api/history/analyses")
    assert r.status_code == 200
    assert len(r.json()["analyses"]) >= 1
    assert r.json()["analyses"][0]["dataset_id"] == "ds1"

    r2 = client.get("/api/history/queries")
    assert r2.status_code == 200
    assert len(r2.json()["queries"]) >= 1
