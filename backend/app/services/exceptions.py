"""Service-layer exceptions.

Routers translate these domain failures into HTTP responses; services avoid
depending on FastAPI status-code machinery.
"""

from __future__ import annotations


class ServiceError(Exception):
    """Base class for expected service-layer failures."""


class DatasetNotFound(ServiceError):
    """A dataset id is unknown to the in-memory/disk store."""


class UploadError(ServiceError):
    """An uploaded file cannot be accepted or parsed."""


class JobNotFound(ServiceError):
    """A background job id is unknown or has expired."""


class InvalidDataset(ServiceError):
    """The dataset is present but cannot support the requested analysis."""


class SqlSafetyError(ServiceError):
    """A SQL query violates the read-only playground guard."""


class SqlExecutionError(ServiceError):
    """DuckDB rejected an otherwise allowed query."""


class AuditTrailUnavailable(ServiceError):
    """The relational audit trail could not be read."""


class InvestigationError(ServiceError):
    """The auditable investigator failed while running domain logic."""


class TextAnalysisError(ServiceError):
    """The compliance NLP analyzer failed."""


class RiskEngineUnavailable(ServiceError):
    """The risk model could not be loaded or trained."""


class RiskExplanationUnavailable(ServiceError):
    """SHAP explanation data is not available for the risk model."""


class RiskExplanationNotFound(ServiceError):
    """A requested SHAP explanation row does not exist."""


class RiskValidationError(ServiceError):
    """Risk model validation failed."""
