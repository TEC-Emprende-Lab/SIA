from datetime import date
from decimal import Decimal
from hashlib import sha256
from typing import Any

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.models.document import Document
from app.models.finanzas import (
    BudgetChange,
    BudgetItem,
    FinanceAttachment,
    FinanceEvent,
    Purchase,
    Reconciliation,
)
from app.models.user import User
from app.modules.finanzas.definitions import CHECKLISTS, LABELS
from app.modules.finanzas.parser import parse_report
from app.modules.seguimiento.policy import Scope, authorize_cycle
from app.schemas import finanzas as s

FINAL = {"executed", "cancelled", "rejected"}
PENDING = {"submitted", "correction_requested", "validated", "fundatec"}


async def scope(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    *,
    manage: bool = False,
    coordinate: bool = False,
    lock: bool = False,
) -> Scope:
    result = await authorize_cycle(db, actor, cycle_id, lock=lock)
    if result.program != "Prototipado":
        raise HTTPException(409, "Finanzas solo está habilitada para Prototipado")
    if coordinate and actor.role != "Coordinadora":
        raise HTTPException(403, "Esta acción requiere Coordinadora; permisos adicionales TBD")
    if manage and actor.role not in {"Gestor", "Coordinadora"}:
        raise HTTPException(403, "Esta acción requiere Gestor asignado o Coordinadora")
    return result


def snapshot(entity: Any) -> dict[str, Any]:
    return {
        c.name: str(getattr(entity, c.name))
        if isinstance(getattr(entity, c.name), Decimal)
        else jsonable_encoder(getattr(entity, c.name))
        for c in entity.__table__.columns
    }


async def record(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    entity: Any,
    action: str,
    observation: str,
    before: dict[str, Any] | None = None,
) -> None:
    await db.flush()
    after = snapshot(entity)
    db.add(
        FinanceEvent(
            cycle_id=cycle_id,
            entity_id=entity.id,
            action=action,
            observation=observation,
            snapshot=after,
            actor_id=actor.id,
        )
    )
    await write_audit(
        db,
        actor.id,
        action,
        type(entity).__name__,
        entity.id,
        before=before,
        after={**after, "observation": observation},
    )


async def commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise


async def purchases(db: AsyncSession, cycle_id: str) -> list[Purchase]:
    return list(
        await db.scalars(
            select(Purchase)
            .where(Purchase.cycle_id == cycle_id)
            .order_by(Purchase.created_at.desc(), Purchase.id)
        )
    )


async def get_purchase(db: AsyncSession, cycle_id: str, purchase_id: str) -> Purchase:
    result = await db.scalar(
        select(Purchase)
        .where(Purchase.id == purchase_id, Purchase.cycle_id == cycle_id)
        .execution_options(populate_existing=True)
    )
    if result is None:
        raise HTTPException(404, "Trámite no encontrado en este ciclo")
    return result


def revision(item: Any, expected: int) -> None:
    if item.revision != expected:
        raise HTTPException(409, "Revisión obsoleta; vuelva a cargar los datos")


def editable(actor: User, purchase: Purchase) -> None:
    if purchase.status not in {"draft", "correction_requested"}:
        raise HTTPException(409, "Solo se editan borradores o correcciones solicitadas")
    if actor.role == "Emprendedor" and purchase.created_by != actor.id:
        raise HTTPException(403, "Solo puede editar sus propios borradores")


async def item_for(db: AsyncSession, cycle_id: str, item_id: str) -> BudgetItem:
    result = await db.get(BudgetItem, item_id, populate_existing=True)
    if result is None or result.cycle_id != cycle_id:
        raise HTTPException(422, "Partida ajena al ciclo")
    return result


def normalize(value: str) -> str:
    return " ".join(value.split()).casefold()


async def check_duplicate(
    db: AsyncSession, cycle_id: str, supplier: str, number: str, excluding: str | None = None
) -> None:
    if not number.strip():
        return
    for purchase in await purchases(db, cycle_id):
        if (
            purchase.id != excluding
            and purchase.status not in {"cancelled", "rejected"}
            and normalize(purchase.invoice_number) == normalize(number)
            and normalize(purchase.supplier) == normalize(supplier)
        ):
            raise HTTPException(
                409, "Ya existe un trámite con este proveedor y número de documento en el ciclo"
            )


def checklist(kind: str, values: dict[str, bool]) -> dict[str, bool]:
    if set(values) - set(CHECKLISTS[kind]):
        raise HTTPException(422, "El checklist contiene campos no definidos para este tipo")
    return {key: values.get(key, False) for key in CHECKLISTS[kind]}


async def create_item(
    db: AsyncSession, actor: User, cycle_id: str, body: s.ItemCreate
) -> BudgetItem:
    sc = await scope(db, actor, cycle_id, coordinate=True, lock=True)
    if await db.scalar(
        select(BudgetItem.id).where(BudgetItem.cycle_id == cycle_id, BudgetItem.name == body.name)
    ):
        raise HTTPException(409, "La partida ya existe")
    item = BudgetItem(
        cycle_id=cycle_id,
        entrepreneurship_id=sc.entrepreneurship_id,
        name=body.name,
        amount=body.amount,
        created_by=actor.id,
    )
    db.add(item)
    await record(db, actor, cycle_id, item, "finance.item_created", body.observation)
    await commit(db)
    return item


async def create_purchase(
    db: AsyncSession, actor: User, cycle_id: str, body: s.PurchaseCreate
) -> Purchase:
    sc = await scope(db, actor, cycle_id, lock=True)
    existing = await db.scalar(
        select(Purchase).where(
            Purchase.cycle_id == cycle_id, Purchase.request_key == body.request_key
        )
    )
    if existing is not None:
        if existing.created_by != actor.id:
            raise HTTPException(409, "Clave de solicitud ya utilizada")
        # A retry must not silently mask a different request.
        values = body.model_dump(exclude={"request_key", "checklist"})
        values["checklist"] = checklist(body.kind, body.checklist)
        if any(getattr(existing, key) != value for key, value in values.items()):
            raise HTTPException(409, "Clave de solicitud reutilizada con datos diferentes")
        return existing
    await item_for(db, cycle_id, body.item_id)
    await check_duplicate(db, cycle_id, body.supplier, body.invoice_number)
    item = Purchase(
        cycle_id=cycle_id,
        entrepreneurship_id=sc.entrepreneurship_id,
        created_by=actor.id,
        **body.model_dump(exclude={"checklist"}),
        checklist=checklist(body.kind, body.checklist),
    )
    db.add(item)
    await record(db, actor, cycle_id, item, "finance.created", "Borrador creado")
    await commit(db)
    return item


async def update_purchase(
    db: AsyncSession, actor: User, cycle_id: str, purchase_id: str, body: s.PurchaseUpdate
) -> Purchase:
    await scope(db, actor, cycle_id, lock=True)
    item = await get_purchase(db, cycle_id, purchase_id)
    editable(actor, item)
    revision(item, body.expected_revision)
    await item_for(db, cycle_id, body.item_id)
    await check_duplicate(db, cycle_id, body.supplier, body.invoice_number, item.id)
    before = snapshot(item)
    for key, value in body.model_dump(
        exclude={"expected_revision", "observation", "checklist"}
    ).items():
        setattr(item, key, value)
    item.checklist = checklist(body.kind, body.checklist)
    item.revision += 1
    await record(db, actor, cycle_id, item, "finance.updated", body.observation, before)
    await commit(db)
    return item


async def transition(
    db: AsyncSession, actor: User, cycle_id: str, purchase_id: str, body: s.Transition
) -> Purchase:
    await scope(
        db,
        actor,
        cycle_id,
        manage=body.action not in {"submit", "execute", "cancel"},
        coordinate=body.action in {"execute", "cancel"},
        lock=True,
    )
    item = await get_purchase(db, cycle_id, purchase_id)
    revision(item, body.expected_revision)
    allowed = {
        "submit": ({"draft", "correction_requested"}, "submitted"),
        "request_correction": ({"submitted"}, "correction_requested"),
        "validate": ({"submitted"}, "validated"),
        "register_fundatec": ({"validated"}, "fundatec"),
        "execute": (
            {"fundatec"} | ({"validated"} if item.kind == "comision_bancaria" else set()),
            "executed",
        ),
        "reject": ({"submitted", "validated"}, "rejected"),
        "cancel": ({"draft", *PENDING}, "cancelled"),
    }
    states, target = allowed[body.action]
    if item.status not in states:
        raise HTTPException(409, "Transición no permitida desde el estado actual")
    if body.action == "submit":
        editable(actor, item)
        await check_duplicate(db, cycle_id, item.supplier, item.invoice_number, item.id)
    if body.action in {"validate", "execute"} and not body.human_reviewed:
        raise HTTPException(422, "Se requiere revisión humana explícita")
    if body.action == "validate" and not all(item.checklist.values()):
        raise HTTPException(422, "Complete el checklist antes de enviar; solicite corrección")
    if body.action == "register_fundatec" and not body.fundatec_number.strip():
        raise HTTPException(422, "Indique el consecutivo FUNDATEC")
    if body.action == "execute" and (body.executed_on is None or body.executed_on > date.today()):
        raise HTTPException(422, "Indique una fecha de ejecución no futura")
    before = snapshot(item)
    item.status = target
    if body.action == "register_fundatec":
        item.fundatec_number = body.fundatec_number.strip()
    if body.action == "execute":
        item.executed_on = body.executed_on
    item.revision += 1
    await record(db, actor, cycle_id, item, f"finance.{body.action}", body.observation, before)
    await notify_transition(db, actor, item, body.action)
    await commit(db)
    return item


async def notify_transition(db: AsyncSession, actor: User, item: Purchase, action: str) -> None:
    from app.modules.comunicacion.service import emit_alert
    from app.modules.seguimiento.policy import has_access

    if action not in {"submit", "request_correction", "reject", "execute"}:
        return
    sc = Scope(item.cycle_id, item.entrepreneurship_id, "Prototipado")
    candidates = list(await db.scalars(select(User).order_by(User.id)))
    for recipient in candidates:
        targeted = (
            recipient.role in {"Gestor", "Coordinadora"}
            if action == "submit"
            else recipient.id == item.created_by
        )
        if targeted and recipient.id != actor.id and await has_access(db, recipient, sc):
            await emit_alert(
                db,
                actor,
                item.entrepreneurship_id,
                item.cycle_id,
                recipient.id,
                "finanzas",
                f"Trámite {item.id}: {action}",
                f"finance:{item.id}:{item.revision}:{recipient.id}",
            )


async def attach(
    db: AsyncSession, actor: User, cycle_id: str, purchase_id: str, body: s.AttachmentCreate
) -> None:
    sc = await scope(db, actor, cycle_id, lock=True)
    item = await get_purchase(db, cycle_id, purchase_id)
    editable(actor, item)
    revision(item, body.expected_revision)
    doc = await db.get(Document, body.document_id)
    if doc is None or doc.entrepreneurship_id != sc.entrepreneurship_id:
        raise HTTPException(422, "Documento ajeno al emprendimiento")
    if await db.scalar(
        select(FinanceAttachment.id).where(
            FinanceAttachment.purchase_id == item.id, FinanceAttachment.document_id == doc.id
        )
    ):
        return
    db.add(FinanceAttachment(purchase_id=item.id, document_id=doc.id, created_by=actor.id))
    item.revision += 1
    await record(db, actor, cycle_id, item, "finance.attached", f"Documento {doc.id}")
    await commit(db)


async def summary(db: AsyncSession, cycle_id: str) -> dict[str, Any]:
    items = list(
        await db.scalars(
            select(BudgetItem).where(BudgetItem.cycle_id == cycle_id).order_by(BudgetItem.name)
        )
    )
    rows = await purchases(db, cycle_id)
    result = []
    for item in items:
        executed = sum(
            (p.amount for p in rows if p.item_id == item.id and p.status == "executed"), Decimal(0)
        )
        pending = sum(
            (p.amount for p in rows if p.item_id == item.id and p.status in PENDING), Decimal(0)
        )
        result.append(
            {
                "id": item.id,
                "name": item.name,
                "revision": item.revision,
                "allocated": str(item.amount),
                "executed": str(executed),
                "pending": str(pending),
                "balance_after_execution": str(item.amount - executed),
                "consumed_percent": str(round(executed * 100 / item.amount, 2))
                if item.amount
                else "0",
                "available": None,
            }
        )
    return {
        "currency": "CRC",
        "items": result,
        "by_type": [
            {
                "kind": kind,
                "label": label,
                "count": len(
                    [
                        p
                        for p in rows
                        if p.kind == kind and p.status not in {"rejected", "cancelled"}
                    ]
                ),
                "executed": str(
                    sum(
                        (p.amount for p in rows if p.kind == kind and p.status == "executed"),
                        Decimal(0),
                    )
                ),
                "pending": str(
                    sum(
                        (p.amount for p in rows if p.kind == kind and p.status in PENDING),
                        Decimal(0),
                    )
                ),
            }
            for kind, label in LABELS.items()
        ],
        "available": None,
        "detail": "Pendientes son informativos. Reserva y disponible operativo: TBD; saldo sobre ejecutado no equivale a fondos libres.",
        "purchase_count": len(rows),
    }


async def change_create(
    db: AsyncSession, actor: User, cycle_id: str, body: s.ChangeCreate
) -> BudgetChange:
    sc = await scope(db, actor, cycle_id, manage=True, lock=True)
    await item_for(db, cycle_id, body.source_id)
    await item_for(db, cycle_id, body.target_id)
    if body.source_id == body.target_id:
        raise HTTPException(422, "Seleccione partidas diferentes")
    item = BudgetChange(
        cycle_id=cycle_id,
        entrepreneurship_id=sc.entrepreneurship_id,
        created_by=actor.id,
        **body.model_dump(),
    )
    db.add(item)
    await record(db, actor, cycle_id, item, "finance.change_requested", body.reason)
    await commit(db)
    return item


async def change_decide(
    db: AsyncSession, actor: User, cycle_id: str, change_id: str, body: s.ChangeDecision
) -> BudgetChange:
    await scope(db, actor, cycle_id, coordinate=True, lock=True)
    item = await db.get(BudgetChange, change_id, populate_existing=True)
    if item is None or item.cycle_id != cycle_id:
        raise HTTPException(404, "Cambio no encontrado")
    revision(item, body.expected_revision)
    if item.status != "pending":
        raise HTTPException(409, "Cambio ya resuelto")
    before = snapshot(item)
    if body.decision == "approve":
        source = await item_for(db, cycle_id, item.source_id)
        target = await item_for(db, cycle_id, item.target_id)
        if target.amount + item.amount > Decimal("999999999999.99"):
            raise HTTPException(422, "El monto excede la capacidad de la partida destino")
        executed = sum(
            (
                p.amount
                for p in await purchases(db, cycle_id)
                if p.item_id == source.id and p.status == "executed"
            ),
            Decimal(0),
        )
        if source.amount - item.amount < executed:
            raise HTTPException(409, "El traslado supera el saldo sobre ejecutado")
        for entity, delta in ((source, -item.amount), (target, item.amount)):
            old = snapshot(entity)
            entity.amount += delta
            entity.revision += 1
            await record(
                db, actor, cycle_id, entity, "finance.item_transferred", body.observation, old
            )
    item.status = "approved" if body.decision == "approve" else "rejected"
    item.revision += 1
    await record(db, actor, cycle_id, item, "finance.change_decided", body.observation, before)
    await commit(db)
    return item


async def duplicates(db: AsyncSession, cycle_id: str) -> list[dict[str, Any]]:
    rows = [p for p in await purchases(db, cycle_id) if p.status not in {"rejected", "cancelled"}]
    groups: dict[tuple[str, Decimal], list[str]] = {}
    for p in rows:
        groups.setdefault((normalize(p.supplier), p.amount), []).append(p.id)
    return [
        {
            "supplier": supplier,
            "amount": str(amount),
            "purchase_ids": ids,
            "warning": "Posible coincidencia, requiere revisión humana",
        }
        for (supplier, amount), ids in groups.items()
        if len(ids) > 1
    ]


async def reconcile(
    db: AsyncSession, actor: User, cycle_id: str, body: s.ReconcileCreate
) -> Reconciliation:
    await scope(db, actor, cycle_id, manage=True, lock=True)
    digest = sha256(body.html.encode()).hexdigest()
    existing = await db.scalar(
        select(Reconciliation).where(
            Reconciliation.cycle_id == cycle_id, Reconciliation.sha256 == digest
        )
    )
    if existing is not None:
        return existing
    reference, external = parse_report(body.html)
    rows = [
        p
        for p in await purchases(db, cycle_id)
        if p.status not in {"cancelled", "rejected"} and p.invoice_number
    ]
    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for p in rows:
        number = p.invoice_number.strip()
        amount = external.get(number)
        seen.add(number)
        matches = [r for r in rows if r.invoice_number.strip() == number]
        status = (
            "ambiguous"
            if len(matches) > 1
            else "only_sea"
            if amount is None
            else "match"
            if p.amount == amount
            else "difference"
        )
        results.append(
            {
                "key": p.id,
                "purchase_id": p.id,
                "invoice_number": number,
                "sea_amount": str(p.amount),
                "fundatec_amount": str(amount) if amount is not None else None,
                "difference": str(amount - p.amount) if amount is not None else None,
                "status": status,
            }
        )
    for number, amount in external.items():
        if number not in seen:
            results.append(
                {
                    "key": f"external-{len(results)}",
                    "purchase_id": None,
                    "invoice_number": number,
                    "sea_amount": None,
                    "fundatec_amount": str(amount),
                    "difference": None,
                    "status": "only_fundatec",
                }
            )
    item = Reconciliation(
        cycle_id=cycle_id,
        name=body.name,
        sha256=digest,
        project_reference=reference[:300],
        results=results,
        created_by=actor.id,
    )
    db.add(item)
    await record(
        db,
        actor,
        cycle_id,
        item,
        "finance.reconciled",
        "Ciclo confirmado manualmente; sin modificar trámites",
    )
    await commit(db)
    return item


async def resolve(
    db: AsyncSession, actor: User, cycle_id: str, reconciliation_id: str, body: s.Resolution
) -> None:
    await scope(db, actor, cycle_id, manage=True, lock=True)
    item = await db.get(Reconciliation, reconciliation_id)
    if item is None or item.cycle_id != cycle_id:
        raise HTTPException(404, "Conciliación no encontrada")
    if not any(row["key"] == body.row_key for row in item.results):
        raise HTTPException(422, "Fila ajena a la conciliación")
    db.add(
        FinanceEvent(
            cycle_id=cycle_id,
            entity_id=item.id,
            action="finance.resolved",
            observation=body.observation,
            snapshot={"row_key": body.row_key},
            actor_id=actor.id,
        )
    )
    await write_audit(
        db, actor.id, "finance.resolved", "Reconciliation", item.id, after=body.model_dump()
    )
    await commit(db)


async def overview(db: AsyncSession, actor: User) -> list[dict[str, Any]]:
    from app.models.expediente import Entrepreneurship, ProgramCycle, ProgramEnrollment
    from app.modules.seguimiento.policy import has_access

    query = (
        select(ProgramCycle, ProgramEnrollment, Entrepreneurship)
        .join(ProgramEnrollment, ProgramEnrollment.id == ProgramCycle.enrollment_id)
        .join(Entrepreneurship, Entrepreneurship.id == ProgramEnrollment.entrepreneurship_id)
        .where(ProgramEnrollment.program == "Prototipado")
        .order_by(Entrepreneurship.name, ProgramCycle.id)
    )
    result = []
    for cycle, enrollment, entrepreneurship in (await db.execute(query)).all():
        sc = Scope(cycle.id, entrepreneurship.id, enrollment.program)
        if await has_access(db, actor, sc):
            result.append(
                {
                    "cycle_id": cycle.id,
                    "cycle_name": cycle.name,
                    "entrepreneurship_name": entrepreneurship.name,
                    **await summary(db, cycle.id),
                }
            )
    return result


async def report_sources(db: AsyncSession, cycle_id: str, start: date, end: date) -> dict[str, Any]:
    rows = [
        p
        for p in await purchases(db, cycle_id)
        if p.executed_on and start <= p.executed_on <= end and p.status == "executed"
    ]
    if not rows:
        return {
            "status": "Pendiente de completar",
            "detail": "Sin ejecuciones financieras registradas en el período",
            "purchases": [],
        }
    return {
        "status": "Registrado",
        "detail": "Ejecuciones del período; fuentes capturadas al aprobar",
        "currency": "CRC",
        "executed": str(sum((p.amount for p in rows), Decimal(0))),
        "purchases": [
            {
                "id": p.id,
                "item_id": p.item_id,
                "kind": LABELS[p.kind],
                "amount": str(p.amount),
                "supplier": p.supplier,
                "invoice_number": p.invoice_number,
                "executed_on": p.executed_on.isoformat(),
                "revision": p.revision,
            }
            for p in rows
            if p.executed_on
        ],
    }
