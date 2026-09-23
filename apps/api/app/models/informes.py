from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TechnicalReport(Base):
    """Informe técnico periódico. Cada fila es una versión de la serie
    (cycle_id, period, kind). Una corrección es una fila nueva con ``version``
    mayor y ``supersedes_id`` a la aprobada anterior; la aprobada nunca cambia.

    La plantilla/campos obligatorios del informe son ``TBD``: el contenido vive
    en ``narrative`` (texto humano) y ``composition`` (instantánea de fuentes
    con su trazabilidad). El PDF privado (R2) lo escribe el worker tras aprobar.
    """

    __tablename__ = "technical_reports"
    __table_args__ = (
        UniqueConstraint("cycle_id", "period_start", "period_end", "kind", "version"),
        CheckConstraint("status IN ('borrador', 'aprobado')", name="ck_report_status"),
        CheckConstraint(
            "status != 'aprobado' OR (reviewed_by IS NOT NULL AND approved_at IS NOT NULL)",
            name="ck_report_review",
        ),
        CheckConstraint("period_start <= period_end", name="ck_report_period"),
        CheckConstraint("version > 0", name="ck_report_version"),
        CheckConstraint("revision > 0", name="ck_report_revision"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    entrepreneurship_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entrepreneurships.id"), index=True
    )
    cycle_id: Mapped[str] = mapped_column(String(36), ForeignKey("program_cycles.id"), index=True)
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    kind: Mapped[str] = mapped_column(String(32), default="mensual")
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="borrador")
    narrative: Mapped[str] = mapped_column(Text, default="")
    composition: Mapped[dict[str, Any]] = mapped_column(JSON)
    supersedes_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("technical_reports.id")
    )
    reviewed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500))
    pdf_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


# Solo el puntero al PDF (lo escribe el worker) puede mutar tras aprobar.
_PDF_FIELDS = {"pdf_storage_key", "pdf_generated_at"}


@event.listens_for(TechnicalReport, "before_update")
def _freeze_approved(_mapper: Any, _connection: Any, target: TechnicalReport) -> None:
    history = inspect(target).attrs.status.history
    previous = history.deleted[0] if history.deleted else target.status
    if previous != "aprobado":
        return
    changed = {
        attr.key
        for attr in inspect(target).attrs
        if attr.history.has_changes() and attr.key not in _PDF_FIELDS
    }
    if changed:
        raise ValueError("El informe aprobado es inmutable; crea una corrección (nueva versión)")


@event.listens_for(TechnicalReport, "before_delete")
def _no_delete(_mapper: Any, _connection: Any, _target: TechnicalReport) -> None:
    raise ValueError("El informe es histórico y no se elimina")
