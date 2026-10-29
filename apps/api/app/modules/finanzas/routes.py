from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.document import Document
from app.models.finanzas import (
    BudgetChange,
    FinanceAttachment,
    FinanceEvent,
    Purchase,
    Reconciliation,
)
from app.models.user import User
from app.modules.finanzas import service
from app.modules.finanzas.definitions import CHECKLISTS, LABELS
from app.modules.finanzas.extraction import extract
from app.modules.finanzas.rate_limit import finance_rate_limit
from app.modules.informes.pdf import render_text_pdf
from app.schemas import finanzas as s
from app.security.deps import get_current_user

router = APIRouter(
    prefix="/cycles/{cycle_id}/finanzas",
    tags=["finanzas"],
    dependencies=[Depends(finance_rate_limit)],
)
global_router = APIRouter(
    prefix="/finanzas", tags=["finanzas"], dependencies=[Depends(finance_rate_limit)]
)
DB = Annotated[AsyncSession, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]


@global_router.get("/overview")
async def overview(db: DB, actor: Actor) -> list[dict[str, Any]]:
    return await service.overview(db, actor)


@global_router.get(
    "/report.pdf",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}
    },
)
async def overview_pdf(db: DB, actor: Actor) -> Response:
    from decimal import Decimal

    lines = [
        "Reporte general financiero operativo · CRC",
        "Solo ciclos autorizados de Prototipado. No es informe técnico aprobado.",
    ]
    rows = await service.overview(db, actor)
    for row in rows:
        allocated = sum((Decimal(i["allocated"]) for i in row["items"]), Decimal(0))
        executed = sum((Decimal(i["executed"]) for i in row["items"]), Decimal(0))
        pending = sum((Decimal(i["pending"]) for i in row["items"]), Decimal(0))
        lines.append(
            f"{row['entrepreneurship_name']} · {row['cycle_name']} · {row['cycle_id']} · asignado {allocated} · ejecutado {executed} · en proceso {pending}"
        )
    lines.append("Reservas y disponible operativo: TBD. Pendientes no equivalen a ejecutado.")
    from app.audit.service import write_audit

    await write_audit(
        db,
        actor.id,
        "finance.overview_exported",
        "User",
        actor.id,
        after={"cycle_count": len(rows)},
    )
    await service.commit(db)
    return Response(
        render_text_pdf(lines), media_type="application/pdf", headers={"Cache-Control": "no-store"}
    )


@router.get("/report-text")
async def report_text(
    cycle_id: str, db: DB, actor: Actor, start: date | None = None, end: date | None = None
) -> dict[str, str]:
    await service.scope(db, actor, cycle_id)
    if start and end and start > end:
        raise HTTPException(422, "Período inválido")
    events = list(
        await db.scalars(
            select(FinanceEvent)
            .where(FinanceEvent.cycle_id == cycle_id, FinanceEvent.action == "finance.validate")
            .order_by(FinanceEvent.created_at)
        )
    )
    lines = [
        f"Reporte de validaciones internas · ciclo {cycle_id}",
        "No acredita pago ni aprobación FUNDATEC.",
    ]
    for row in events:
        if (not start or row.created_at.date() >= start) and (
            not end or row.created_at.date() <= end
        ):
            p = row.snapshot
            lines.append(
                f"* {p['id']} · {LABELS[p['kind']]} · {p['supplier']} · {p['amount']} CRC · documento {p['invoice_number']} · validado por {row.actor_id}"
            )
    return {"text": "\n".join(lines)}


@router.get("/definitions")
async def definitions(cycle_id: str, db: DB, actor: Actor) -> dict[str, Any]:
    await service.scope(db, actor, cycle_id)
    return {"types": LABELS, "checklists": CHECKLISTS, "checklist_version": 1, "currency": "CRC"}


@router.post("/extract")
async def extraction(cycle_id: str, db: DB, actor: Actor, body: s.Extraction) -> dict[str, Any]:
    await service.scope(db, actor, cycle_id)
    from starlette.concurrency import run_in_threadpool

    return await run_in_threadpool(extract, body.name, body.content_base64)


@router.get("/summary")
async def summary(cycle_id: str, db: DB, actor: Actor) -> dict[str, Any]:
    await service.scope(db, actor, cycle_id)
    return await service.summary(db, cycle_id)


@router.post("/items", response_model=s.ItemOut, status_code=201)
async def item_create(cycle_id: str, db: DB, actor: Actor, body: s.ItemCreate) -> Any:
    return await service.create_item(db, actor, cycle_id, body)


@router.get("/purchases", response_model=list[s.PurchaseOut])
async def purchases(
    cycle_id: str,
    db: DB,
    actor: Actor,
    offset: Offset = 0,
    limit: Limit = 50,
    status: str | None = None,
    kind: s.Kind | None = None,
    start: date | None = None,
    end: date | None = None,
) -> list[Purchase]:
    await service.scope(db, actor, cycle_id)
    if start and end and start > end:
        raise HTTPException(422, "Período inválido")
    query = select(Purchase).where(Purchase.cycle_id == cycle_id)
    if status:
        query = query.where(Purchase.status == status)
    if kind:
        query = query.where(Purchase.kind == kind)
    if start:
        query = query.where(Purchase.created_at >= start)
    if end:
        from datetime import timedelta

        query = query.where(Purchase.created_at < end + timedelta(days=1))
    return list(
        await db.scalars(
            query.order_by(Purchase.created_at.desc(), Purchase.id).offset(offset).limit(limit)
        )
    )


@router.post("/purchases", response_model=s.PurchaseOut, status_code=201)
async def purchase_create(cycle_id: str, db: DB, actor: Actor, body: s.PurchaseCreate) -> Any:
    return await service.create_purchase(db, actor, cycle_id, body)


@router.put("/purchases/{purchase_id}", response_model=s.PurchaseOut)
async def purchase_update(
    cycle_id: str, purchase_id: str, db: DB, actor: Actor, body: s.PurchaseUpdate
) -> Any:
    return await service.update_purchase(db, actor, cycle_id, purchase_id, body)


@router.get("/purchases/{purchase_id}", response_model=s.PurchaseOut)
async def purchase_get(cycle_id: str, purchase_id: str, db: DB, actor: Actor) -> Any:
    await service.scope(db, actor, cycle_id)
    return await service.get_purchase(db, cycle_id, purchase_id)


@router.post("/purchases/{purchase_id}/transitions", response_model=s.PurchaseOut)
async def transition(
    cycle_id: str, purchase_id: str, db: DB, actor: Actor, body: s.Transition
) -> Any:
    return await service.transition(db, actor, cycle_id, purchase_id, body)


@router.get("/purchases/{purchase_id}/attachments", response_model=list[s.AttachmentOut])
async def attachments(cycle_id: str, purchase_id: str, db: DB, actor: Actor) -> Any:
    await service.scope(db, actor, cycle_id)
    await service.get_purchase(db, cycle_id, purchase_id)
    rows = (
        await db.execute(
            select(FinanceAttachment, Document.name)
            .join(Document, Document.id == FinanceAttachment.document_id)
            .where(FinanceAttachment.purchase_id == purchase_id)
        )
    ).all()
    return [{"id": a.id, "document_id": a.document_id, "name": name} for a, name in rows]


@router.post("/purchases/{purchase_id}/attachments", status_code=201)
async def attach(
    cycle_id: str, purchase_id: str, db: DB, actor: Actor, body: s.AttachmentCreate
) -> dict[str, bool]:
    await service.attach(db, actor, cycle_id, purchase_id, body)
    return {"ok": True}


@router.get("/events", response_model=list[s.EventOut])
async def events(
    cycle_id: str, db: DB, actor: Actor, entity_id: str, offset: Offset = 0, limit: Limit = 50
) -> Any:
    await service.scope(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(FinanceEvent)
            .where(FinanceEvent.cycle_id == cycle_id, FinanceEvent.entity_id == entity_id)
            .order_by(FinanceEvent.created_at.desc(), FinanceEvent.id)
            .offset(offset)
            .limit(limit)
        )
    )


@router.get("/changes", response_model=list[s.ChangeOut])
async def changes(
    cycle_id: str, db: DB, actor: Actor, offset: Offset = 0, limit: Limit = 50
) -> Any:
    await service.scope(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(BudgetChange)
            .where(BudgetChange.cycle_id == cycle_id)
            .order_by(BudgetChange.created_at.desc(), BudgetChange.id)
            .offset(offset)
            .limit(limit)
        )
    )


@router.post("/changes", response_model=s.ChangeOut, status_code=201)
async def change_create(cycle_id: str, db: DB, actor: Actor, body: s.ChangeCreate) -> Any:
    return await service.change_create(db, actor, cycle_id, body)


@router.post("/changes/{change_id}/decision", response_model=s.ChangeOut)
async def change_decide(
    cycle_id: str, change_id: str, db: DB, actor: Actor, body: s.ChangeDecision
) -> Any:
    return await service.change_decide(db, actor, cycle_id, change_id, body)


@router.get("/duplicates")
async def duplicates(cycle_id: str, db: DB, actor: Actor) -> list[dict[str, Any]]:
    await service.scope(db, actor, cycle_id)
    return await service.duplicates(db, cycle_id)


@router.get("/reconciliations", response_model=list[s.ReconciliationOut])
async def reconciliations(
    cycle_id: str, db: DB, actor: Actor, offset: Offset = 0, limit: Limit = 50
) -> Any:
    await service.scope(db, actor, cycle_id, manage=True)
    return list(
        await db.scalars(
            select(Reconciliation)
            .where(Reconciliation.cycle_id == cycle_id)
            .order_by(Reconciliation.created_at.desc(), Reconciliation.id)
            .offset(offset)
            .limit(limit)
        )
    )


@router.post("/reconciliations", response_model=s.ReconciliationOut, status_code=201)
async def reconcile(cycle_id: str, db: DB, actor: Actor, body: s.ReconcileCreate) -> Any:
    return await service.reconcile(db, actor, cycle_id, body)


@router.post("/reconciliations/{reconciliation_id}/resolutions", status_code=201)
async def resolve(
    cycle_id: str, reconciliation_id: str, db: DB, actor: Actor, body: s.Resolution
) -> dict[str, bool]:
    await service.resolve(db, actor, cycle_id, reconciliation_id, body)
    return {"ok": True}


@router.get(
    "/report.pdf",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}
    },
)
async def report_pdf(
    cycle_id: str,
    db: DB,
    actor: Actor,
    start: date | None = None,
    end: date | None = None,
    kind: s.Kind | None = None,
    status: str | None = None,
) -> Response:
    await service.scope(db, actor, cycle_id)
    if start and end and start > end:
        raise HTTPException(422, "Período inválido")
    rows = [
        p
        for p in await service.purchases(db, cycle_id)
        if (not kind or p.kind == kind)
        and (not status or p.status == status)
        and (not start or p.created_at.date() >= start)
        and (not end or p.created_at.date() <= end)
    ]
    lines = [
        "Reporte financiero operativo (no es informe técnico aprobado)",
        f"Ciclo: {cycle_id}",
        f"Fecha de registro: {start or 'Inicio'} a {end or 'Hoy'} · CRC",
    ]
    for row in rows:
        lines.append(
            f"{row.id} | {LABELS[row.kind]} | {row.status} | {row.amount} CRC | {row.supplier} | {row.invoice_number}"
        )
    lines.extend(
        [
            f"{len(rows)} trámites. No suma pagos y pendientes como ejecutado.",
            "Disponible operativo y reservas TBD. Se conserva el historial en SEA.",
        ]
    )
    await write_export_audit(db, actor, cycle_id, len(rows))
    return Response(
        render_text_pdf(lines),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="finanzas-operativo.pdf"',
            "Cache-Control": "no-store",
        },
    )


async def write_export_audit(db: AsyncSession, actor: User, cycle_id: str, count: int) -> None:
    from app.audit.service import write_audit

    await write_audit(
        db, actor.id, "finance.exported", "ProgramCycle", cycle_id, after={"count": count}
    )
    await service.commit(db)
