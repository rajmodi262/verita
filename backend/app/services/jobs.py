"""In-process background jobs for dashboard ingestion.

This is intentionally small but real: uploads can return a job id immediately,
while parsing/profiling/insight generation happens in a worker thread.
"""

from __future__ import annotations

import datetime as dt
import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

from .dashboard_service import generate_dashboard
from .exceptions import JobNotFound

logger = logging.getLogger("verita.services.jobs")


@dataclass
class Job:
    id: str
    kind: str
    filename: str
    status: str = "queued"
    progress: int = 0
    steps: list[str] = field(default_factory=list)
    result: dict[str, Any] | None = None
    error: str | None = None
    created_at: str = field(default_factory=lambda: dt.datetime.utcnow().isoformat() + "Z")
    updated_at: str = field(default_factory=lambda: dt.datetime.utcnow().isoformat() + "Z")

    def as_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.id,
            "kind": self.kind,
            "filename": self.filename,
            "status": self.status,
            "progress": self.progress,
            "steps": self.steps,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


_jobs: dict[str, Job] = {}
_lock = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="verita-job")


def _patch(job_id: str, **changes: Any) -> None:
    with _lock:
        job = _jobs[job_id]
        for key, value in changes.items():
            setattr(job, key, value)
        job.updated_at = dt.datetime.utcnow().isoformat() + "Z"


def _append_step(job_id: str, step: str, progress: int) -> None:
    with _lock:
        job = _jobs[job_id]
        job.steps.append(step)
        job.progress = max(job.progress, progress)
        job.updated_at = dt.datetime.utcnow().isoformat() + "Z"


def _run_dashboard_job(job_id: str, filename: str, raw: bytes) -> None:
    try:
        _patch(job_id, status="running", progress=8)
        _append_step(job_id, "Upload accepted; parsing file bytes.", 15)
        _append_step(job_id, "Profiling columns and validating schema.", 35)
        result = generate_dashboard(filename, raw)
        _append_step(job_id, "Dashboard, insights, validation, and audit log complete.", 90)
        _patch(job_id, status="succeeded", progress=100, result=result)
    except Exception as exc:  # noqa: BLE001 - job surface records clean failure text
        logger.exception("dashboard job %s failed", job_id)
        _patch(job_id, status="failed", progress=100, error=str(exc))


def create_dashboard_job(filename: str, raw: bytes) -> dict[str, Any]:
    job_id = uuid.uuid4().hex[:12]
    job = Job(id=job_id, kind="dashboard_ingestion", filename=filename)
    with _lock:
        _jobs[job_id] = job
    _executor.submit(_run_dashboard_job, job_id, filename, raw)
    return job.as_dict()


def get_job(job_id: str) -> dict[str, Any]:
    with _lock:
        job = _jobs.get(job_id)
        if job is None:
            raise JobNotFound("Job not found")
        return job.as_dict()
