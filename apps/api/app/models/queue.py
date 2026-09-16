from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Job(Base):
    """Cola de trabajos persistente en PostgreSQL.

    Se reclama con ``FOR UPDATE SKIP LOCKED`` para que varios workers escalen en
    horizontal; idempotente por ``idempotency_key``. Es infraestructura, no
    dominio: no lleva columnas de alcance (``entrepreneurship_id``/``cycle_id``)
    ni superficie HTTP. La alimentan los eventos autorizados de otros módulos
    (correo Resend, PDF, minutas IA, alertas).
    """

    __tablename__ = "job_queue"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'claimed', 'done', 'failed')", name="ck_job_status"),
        CheckConstraint("attempts >= 0", name="ck_job_attempts"),
        CheckConstraint("max_attempts >= 1", name="ck_job_max_attempts"),
        # El worker filtra por (status, run_at) al reclamar; el índice lo cubre.
        Index("ix_job_queue_claimable", "status", "run_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(200), unique=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[str | None] = mapped_column(String(64))
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
