"""
Verita — relational persistence (SQLAlchemy).

Speaks Postgres in production (via DATABASE_URL) and falls back to a local SQLite file when no
DATABASE_URL is set, so the app runs zero-config but uses real Postgres under docker-compose.
The ORM code is identical across both — only the connection URL changes.

Persisted here: an audit trail of every analysis (dataset uploaded) and every SQL query run —
exactly the kind of immutable record an FCC/compliance system needs.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# postgresql+psycopg2://user:pass@host:5432/db  — or default to a local SQLite file.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./verita.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create tables if they don't exist. Safe to call repeatedly."""
    from . import models_db  # noqa: F401  (register models on Base)

    Base.metadata.create_all(engine)


def dialect() -> str:
    return engine.dialect.name
