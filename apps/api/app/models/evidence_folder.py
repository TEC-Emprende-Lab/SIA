"""Organization only: evidence and approved snapshots remain immutable."""

from sqlalchemy import ForeignKey, ForeignKeyConstraint, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.seguimiento import Record


class EvidenceFolder(Record, Base):
    __tablename__ = "evidence_folders"
    __table_args__ = (UniqueConstraint("id", "cycle_id"),)

    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    revision: Mapped[int] = mapped_column(Integer, default=1)


class EvidencePlacement(Base):
    __tablename__ = "evidence_placements"
    __table_args__ = (
        ForeignKeyConstraint(
            ["evidence_id", "cycle_id"], ["evidence_references.id", "evidence_references.cycle_id"]
        ),
        ForeignKeyConstraint(
            ["folder_id", "cycle_id"], ["evidence_folders.id", "evidence_folders.cycle_id"]
        ),
    )

    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence_references.id"), primary_key=True)
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    folder_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)

    @property
    def id(self) -> str:
        return self.evidence_id
