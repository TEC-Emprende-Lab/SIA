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
    ForeignKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    event,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class Editable(Record):
    revision: Mapped[int] = mapped_column(default=1, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)


class ProgramCanvas(Record, Base):
    __tablename__ = "program_canvases"
    __table_args__ = (UniqueConstraint("program", "version"), CheckConstraint("version > 0"))

    program: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(nullable=False)


class CanvasArea(Record, Base):
    __tablename__ = "canvas_areas"
    __table_args__ = (
        UniqueConstraint("id", "canvas_id"),
        UniqueConstraint("canvas_id", "key"),
        UniqueConstraint("canvas_id", "position"),
    )

    canvas_id: Mapped[str] = mapped_column(ForeignKey("program_canvases.id"), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)


class CycleCanvas(Base):
    """Pins the definition used by a cycle; never follows a mutable 'latest'."""

    __tablename__ = "cycle_canvases"
    __table_args__ = (UniqueConstraint("cycle_id", "canvas_id", "entrepreneurship_id"),)

    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), primary_key=True)
    canvas_id: Mapped[str] = mapped_column(ForeignKey("program_canvases.id"), nullable=False)
    entrepreneurship_id: Mapped[str] = mapped_column(
        ForeignKey("entrepreneurships.id"), nullable=False
    )


class Ambition(Editable, Base):
    __tablename__ = "ambitions"
    __table_args__ = (UniqueConstraint("id", "entrepreneurship_id"),)

    entrepreneurship_id: Mapped[str] = mapped_column(
        ForeignKey("entrepreneurships.id"), nullable=False, index=True
    )


class Objective(Editable, Base):
    __tablename__ = "objectives"
    __table_args__ = (
        UniqueConstraint("id", "cycle_id"),
        ForeignKeyConstraint(
            ["cycle_id", "canvas_id", "entrepreneurship_id"],
            [
                "cycle_canvases.cycle_id",
                "cycle_canvases.canvas_id",
                "cycle_canvases.entrepreneurship_id",
            ],
        ),
        ForeignKeyConstraint(
            ["area_id", "canvas_id"], ["canvas_areas.id", "canvas_areas.canvas_id"]
        ),
        ForeignKeyConstraint(
            ["ambition_id", "entrepreneurship_id"],
            ["ambitions.id", "ambitions.entrepreneurship_id"],
        ),
        CheckConstraint(
            "status IN ('draft', 'pending_validation', 'approved', 'correction_requested', 'rejected')"
        ),
        CheckConstraint("revision > 0"),
    )

    cycle_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    canvas_id: Mapped[str] = mapped_column(String(36), nullable=False)
    entrepreneurship_id: Mapped[str] = mapped_column(String(36), nullable=False)
    area_id: Mapped[str] = mapped_column(String(36), nullable=False)
    ambition_id: Mapped[str | None] = mapped_column(String(36))
    # Official deliverable definitions/mandatory flags remain TBD. This is a work-plan reference.
    deliverable: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)


class Activity(Editable, Base):
    __tablename__ = "activities"
    __table_args__ = (
        UniqueConstraint("id", "cycle_id"),
        ForeignKeyConstraint(
            ["objective_id", "cycle_id"], ["objectives.id", "objectives.cycle_id"]
        ),
        CheckConstraint("starts_on <= ends_on"),
        CheckConstraint("revision > 0"),
    )

    cycle_id: Mapped[str] = mapped_column(
        ForeignKey("program_cycles.id"), nullable=False, index=True
    )
    objective_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    responsible_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Evidence(Record, Base):
    """Append-only references; no binary upload, storage keys or remote fetching."""

    __tablename__ = "evidence_references"
    __table_args__ = (
        ForeignKeyConstraint(["activity_id", "cycle_id"], ["activities.id", "activities.cycle_id"]),
        CheckConstraint("kind IN ('link', 'file', 'photograph', 'video')"),
    )

    cycle_id: Mapped[str] = mapped_column(
        ForeignKey("program_cycles.id"), nullable=False, index=True
    )
    activity_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)


class Diagnostic(Record, Base):
    __tablename__ = "diagnostics"
    __table_args__ = (
        UniqueConstraint("id", "cycle_id"),
        ForeignKeyConstraint(
            ["cycle_id", "canvas_id", "entrepreneurship_id"],
            [
                "cycle_canvases.cycle_id",
                "cycle_canvases.canvas_id",
                "cycle_canvases.entrepreneurship_id",
            ],
        ),
        ForeignKeyConstraint(
            ["supersedes_id", "cycle_id"], ["diagnostics.id", "diagnostics.cycle_id"]
        ),
        CheckConstraint(
            "status IN ('draft', 'pending_validation', 'approved', 'correction_requested', 'rejected')"
        ),
        CheckConstraint("revision > 0"),
    )

    cycle_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    canvas_id: Mapped[str] = mapped_column(String(36), nullable=False)
    entrepreneurship_id: Mapped[str] = mapped_column(String(36), nullable=False)
    revision: Mapped[int] = mapped_column(default=1, nullable=False)
    assessed_on: Mapped[date] = mapped_column(Date, nullable=False)
    assessments: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    supersedes_id: Mapped[str | None] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)


class Validation(Record, Base):
    __tablename__ = "tracking_validations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["objective_id", "cycle_id"], ["objectives.id", "objectives.cycle_id"]
        ),
        ForeignKeyConstraint(
            ["diagnostic_id", "cycle_id"], ["diagnostics.id", "diagnostics.cycle_id"]
        ),
        CheckConstraint("(objective_id IS NULL) <> (diagnostic_id IS NULL)"),
        CheckConstraint("decision IN ('approve', 'request_correction', 'reject')"),
    )

    cycle_id: Mapped[str] = mapped_column(
        ForeignKey("program_cycles.id"), nullable=False, index=True
    )
    objective_id: Mapped[str | None] = mapped_column(String(36), index=True)
    diagnostic_id: Mapped[str | None] = mapped_column(String(36), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    observation: Mapped[str] = mapped_column(Text, nullable=False)
    entity_revision: Mapped[int] = mapped_column(nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


def _immutable(_mapper: Any, _connection: Any, _target: Any) -> None:
    raise ValueError("El registro histórico es inmutable")


for _model in (ProgramCanvas, CanvasArea, CycleCanvas, Evidence, Validation):
    event.listen(_model, "before_update", _immutable)
    event.listen(_model, "before_delete", _immutable)


@event.listens_for(Diagnostic, "before_update")
def _protect_approved(_mapper: Any, _connection: Any, target: Diagnostic) -> None:
    history = inspect(target).attrs.status.history
    previous = history.deleted[0] if history.deleted else target.status
    if previous == "approved":
        raise ValueError("El diagnóstico aprobado es inmutable; crea una nueva fotografía")


for _historical_model in (Ambition, Objective, Activity, Diagnostic):
    event.listen(_historical_model, "before_delete", _immutable)
