"""US-PRO-003/007–010: finanzas por ciclo, sin borrado histórico."""

from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    event,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.seguimiento import Record


class BudgetItem(Record, Base):
    __tablename__ = "finance_budget_items"
    __table_args__ = (
        UniqueConstraint("id", "cycle_id", "entrepreneurship_id"),
        UniqueConstraint("cycle_id", "name"),
        CheckConstraint("amount >= 0"),
    )
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    entrepreneurship_id: Mapped[str] = mapped_column(ForeignKey("entrepreneurships.id"))
    name: Mapped[str] = mapped_column(String(200))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    revision: Mapped[int] = mapped_column(default=1)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class Purchase(Record, Base):
    __tablename__ = "finance_purchases"
    __table_args__ = (
        ForeignKeyConstraint(
            ["item_id", "cycle_id", "entrepreneurship_id"],
            [
                "finance_budget_items.id",
                "finance_budget_items.cycle_id",
                "finance_budget_items.entrepreneurship_id",
            ],
        ),
        CheckConstraint("amount > 0"),
        CheckConstraint(
            "kind IN ('factura','reintegro','uso_tc','comision_bancaria','pago_contrato')"
        ),
        CheckConstraint(
            "status IN ('draft','submitted','correction_requested','validated','fundatec','executed','rejected','cancelled')"
        ),
        CheckConstraint("status != 'executed' OR executed_on IS NOT NULL"),
        CheckConstraint("revision > 0"),
        UniqueConstraint("cycle_id", "request_key"),
    )
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    entrepreneurship_id: Mapped[str] = mapped_column(ForeignKey("entrepreneurships.id"))
    item_id: Mapped[str] = mapped_column(String(36))
    kind: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    supplier: Mapped[str] = mapped_column(String(200))
    invoice_number: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text)
    submission_date: Mapped[date | None] = mapped_column(Date)
    executed_on: Mapped[date | None] = mapped_column(Date)
    fundatec_number: Mapped[str] = mapped_column(String(100), default="")
    checklist: Mapped[dict[str, bool]] = mapped_column(JSON)
    checklist_version: Mapped[int] = mapped_column(default=1)
    revision: Mapped[int] = mapped_column(default=1)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    request_key: Mapped[str] = mapped_column(String(100))


class FinanceAttachment(Record, Base):
    __tablename__ = "finance_attachments"
    __table_args__ = (UniqueConstraint("purchase_id", "document_id"),)
    purchase_id: Mapped[str] = mapped_column(ForeignKey("finance_purchases.id"), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class BudgetChange(Record, Base):
    __tablename__ = "finance_budget_changes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["source_id", "cycle_id", "entrepreneurship_id"],
            [
                "finance_budget_items.id",
                "finance_budget_items.cycle_id",
                "finance_budget_items.entrepreneurship_id",
            ],
        ),
        ForeignKeyConstraint(
            ["target_id", "cycle_id", "entrepreneurship_id"],
            [
                "finance_budget_items.id",
                "finance_budget_items.cycle_id",
                "finance_budget_items.entrepreneurship_id",
            ],
        ),
        CheckConstraint("amount > 0 AND source_id != target_id"),
        CheckConstraint("status IN ('pending','approved','rejected')"),
    )
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    entrepreneurship_id: Mapped[str] = mapped_column(ForeignKey("entrepreneurships.id"))
    source_id: Mapped[str] = mapped_column(String(36))
    target_id: Mapped[str] = mapped_column(String(36))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    revision: Mapped[int] = mapped_column(default=1)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class Reconciliation(Record, Base):
    __tablename__ = "finance_reconciliations"
    __table_args__ = (UniqueConstraint("cycle_id", "sha256"),)
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    sha256: Mapped[str] = mapped_column(String(64))
    project_reference: Mapped[str] = mapped_column(String(300))
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class FinanceEvent(Record, Base):
    __tablename__ = "finance_events"
    cycle_id: Mapped[str] = mapped_column(ForeignKey("program_cycles.id"), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(64))
    observation: Mapped[str] = mapped_column(Text)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))


def _no_delete(_mapper: Any, _connection: Any, _target: Any) -> None:
    raise ValueError("Finanzas conserva el historial; no se elimina")


def _immutable(_mapper: Any, _connection: Any, _target: Any) -> None:
    raise ValueError("Registro financiero histórico inmutable")


def _freeze_final(_mapper: Any, _connection: Any, target: Purchase | BudgetChange) -> None:
    state: Any = inspect(target)
    history = state.attrs.status.history
    previous = history.deleted[0] if history.deleted else target.status
    finals = (
        {"executed", "cancelled", "rejected"}
        if isinstance(target, Purchase)
        else {"approved", "rejected"}
    )
    if previous in finals:
        raise ValueError("Registro financiero final inmutable")


for model in (BudgetItem, Purchase, FinanceAttachment, BudgetChange, Reconciliation, FinanceEvent):
    event.listen(model, "before_delete", _no_delete)
for model in (FinanceAttachment, Reconciliation, FinanceEvent):
    event.listen(model, "before_update", _immutable)
for model in (Purchase, BudgetChange):
    event.listen(model, "before_update", _freeze_final)
