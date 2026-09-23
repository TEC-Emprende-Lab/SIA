from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.models.comunicacion import Agreement, Meeting, Minutes
from app.models.informes import TechnicalReport
from app.models.queue import Job
from app.models.seguimiento import Activity, Evidence, Objective
from app.models.user import User
from app.modules.informes import policy
from app.queue import service as queue
from app.schemas import informes as s

PDF_JOB = "informe.pdf"


def _snapshot(report: TechnicalReport) -> dict[str, Any]:
    return {c.name: jsonable_encoder(getattr(report, c.name)) for c in report.__table__.columns}


async def _persist(
    db: AsyncSession,
    actor: User,
    report: TechnicalReport,
    action: str,
    *,
    before: dict[str, Any] | None = None,
    observation: str,
) -> TechnicalReport:
    db.add(report)
    try:
        await db.flush()
        await write_audit(
            db,
            actor.id,
            action,
            "TechnicalReport",
            report.id,
            before=before,
            after={**_snapshot(report), "observation": observation},
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return report


def _check(report: TechnicalReport, expected_revision: int) -> None:
    if report.status == "aprobado":
        raise HTTPException(409, "Informe aprobado inmutable; crear una corrección")
    if report.revision != expected_revision:
        raise HTTPException(409, "Revisión obsoleta")


async def _compose(
    db: AsyncSession, cycle_id: str, period_start: date, period_end: date
) -> dict[str, Any]:
    """Reúne las fuentes autorizadas del período con su procedencia. Nada se
    inventa; lo no implementado se marca ``Pendiente de completar``."""
    start = datetime.combine(period_start, time.min, tzinfo=UTC)
    end = datetime.combine(period_end, time.min, tzinfo=UTC) + timedelta(days=1)

    objectives = list(
        await db.scalars(
            select(Objective).where(Objective.cycle_id == cycle_id, Objective.status == "approved")
        )
    )
    activities = list(
        await db.scalars(
            select(Activity).where(
                Activity.cycle_id == cycle_id,
                Activity.completed_at.is_not(None),
                Activity.completed_at >= start,
                Activity.completed_at < end,
            )
        )
    )
    activity_ids = [a.id for a in activities]
    evidence = (
        list(
            await db.scalars(
                select(Evidence).where(
                    Evidence.cycle_id == cycle_id, Evidence.activity_id.in_(activity_ids)
                )
            )
        )
        if activity_ids
        else []
    )
    minutes = list(
        await db.scalars(
            select(Minutes)
            .join(Meeting, Minutes.meeting_id == Meeting.id)
            .where(
                Meeting.cycle_id == cycle_id,
                Meeting.revoked_at.is_(None),
                Meeting.scheduled_at >= start,
                Meeting.scheduled_at < end,
                Minutes.status == "aprobada",
                Minutes.revoked_at.is_(None),
            )
        )
    )
    agreements = list(
        await db.scalars(
            select(Agreement)
            .join(Meeting, Agreement.meeting_id == Meeting.id)
            .where(
                Meeting.cycle_id == cycle_id,
                Meeting.revoked_at.is_(None),
                Meeting.scheduled_at >= start,
                Meeting.scheduled_at < end,
                Agreement.revoked_at.is_(None),
            )
        )
    )
    return {
        "objectives": [
            {"id": o.id, "title": o.title, "area_id": o.area_id, "deliverable": o.deliverable}
            for o in objectives
        ],
        "activities_completed": [
            {
                "id": a.id,
                "title": a.title,
                "objective_id": a.objective_id,
                "completed_at": jsonable_encoder(a.completed_at),
            }
            for a in activities
        ],
        "evidence": [
            {
                "id": e.id,
                "activity_id": e.activity_id,
                "title": e.title,
                "kind": e.kind,
                "url": e.url,
            }
            for e in evidence
        ],
        "minutes_approved": [
            {"id": m.id, "meeting_id": m.meeting_id, "approved_at": jsonable_encoder(m.approved_at)}
            for m in minutes
        ],
        "agreements": [
            {
                "id": g.id,
                "meeting_id": g.meeting_id,
                "description": g.description,
                "responsible_id": g.responsible_id,
                "due_date": jsonable_encoder(g.due_date),
            }
            for g in agreements
        ],
        # Fase 6 (finanzas) aún no implementada: fuente ausente, no inventada.
        "finances": {
            "status": "Pendiente de completar",
            "detail": "Módulo de finanzas (Fase 6) pendiente",
        },
    }


async def _get(
    db: AsyncSession, cycle_id: str, report_id: str, *, lock: bool = False
) -> TechnicalReport:
    query = select(TechnicalReport).where(TechnicalReport.id == report_id)
    if lock:
        query = query.with_for_update()
    report = await db.scalar(query.execution_options(populate_existing=True))
    if report is None or report.cycle_id != cycle_id:
        raise HTTPException(404, "Informe no encontrado")
    return report


async def get_report(
    db: AsyncSession, actor: User, cycle_id: str, report_id: str
) -> TechnicalReport:
    await policy.cycle_scope(db, actor, cycle_id)
    return await _get(db, cycle_id, report_id)


async def list_reports(
    db: AsyncSession, actor: User, cycle_id: str, offset: int, limit: int
) -> list[TechnicalReport]:
    await policy.cycle_scope(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(TechnicalReport)
            .where(TechnicalReport.cycle_id == cycle_id)
            .order_by(TechnicalReport.period_start, TechnicalReport.version, TechnicalReport.id)
            .offset(offset)
            .limit(limit)
        )
    )


async def create_report(
    db: AsyncSession, actor: User, cycle_id: str, payload: s.ReportCreate
) -> TechnicalReport:
    eid = await policy.cycle_scope(db, actor, cycle_id, manage=True, lock=True)
    existing = await db.scalar(
        select(TechnicalReport).where(
            TechnicalReport.cycle_id == cycle_id,
            TechnicalReport.period_start == payload.period_start,
            TechnicalReport.period_end == payload.period_end,
            TechnicalReport.kind == payload.kind,
        )
    )
    if existing is not None:
        raise HTTPException(409, "Ya existe un informe para el período; use una corrección")
    report = TechnicalReport(
        entrepreneurship_id=eid,
        cycle_id=cycle_id,
        period_start=payload.period_start,
        period_end=payload.period_end,
        kind=payload.kind,
        narrative=payload.narrative,
        composition=await _compose(db, cycle_id, payload.period_start, payload.period_end),
        created_by=actor.id,
    )
    return await _persist(db, actor, report, "report.created", observation="Informe creado")


async def update_report(
    db: AsyncSession, actor: User, cycle_id: str, report_id: str, payload: s.ReportUpdate
) -> TechnicalReport:
    await policy.cycle_scope(db, actor, cycle_id, manage=True, lock=True)
    report = await _get(db, cycle_id, report_id, lock=True)
    _check(report, payload.expected_revision)
    before = _snapshot(report)
    report.narrative = payload.narrative
    report.revision += 1
    return await _persist(
        db, actor, report, "report.updated", before=before, observation=payload.observation
    )


async def approve_report(
    db: AsyncSession, actor: User, cycle_id: str, report_id: str, payload: s.ReportApproval
) -> TechnicalReport:
    await policy.cycle_scope(db, actor, cycle_id, manage=True, lock=True)
    report = await _get(db, cycle_id, report_id, lock=True)
    _check(report, payload.expected_revision)
    before = _snapshot(report)
    # La instantánea inmutable se captura en el momento de aprobar.
    report.composition = await _compose(db, cycle_id, report.period_start, report.period_end)
    report.status = "aprobado"
    report.reviewed_by = actor.id
    report.approved_at = datetime.now(UTC)
    report.revision += 1
    await queue.enqueue(
        db, PDF_JOB, {"report_id": report.id}, idempotency_key=f"informe-pdf:{report.id}"
    )
    return await _persist(
        db, actor, report, "report.approved", before=before, observation=payload.observation
    )


async def correct_report(
    db: AsyncSession, actor: User, cycle_id: str, report_id: str, payload: s.ReportCorrection
) -> TechnicalReport:
    await policy.cycle_scope(db, actor, cycle_id, manage=True, lock=True)
    approved = await _get(db, cycle_id, report_id, lock=True)
    if approved.status != "aprobado":
        raise HTTPException(409, "Solo se corrige un informe aprobado")
    # Siguiente versión = máx. de la serie + 1, así corregir una versión antigua
    # no colisiona con la constraint única (cycle, period, kind, version).
    top = await db.scalar(
        select(func.max(TechnicalReport.version)).where(
            TechnicalReport.cycle_id == cycle_id,
            TechnicalReport.period_start == approved.period_start,
            TechnicalReport.period_end == approved.period_end,
            TechnicalReport.kind == approved.kind,
        )
    )
    correction = TechnicalReport(
        entrepreneurship_id=approved.entrepreneurship_id,
        cycle_id=cycle_id,
        period_start=approved.period_start,
        period_end=approved.period_end,
        kind=approved.kind,
        version=(top or 0) + 1,
        narrative=payload.narrative if payload.narrative is not None else approved.narrative,
        composition=await _compose(db, cycle_id, approved.period_start, approved.period_end),
        supersedes_id=approved.id,
        created_by=actor.id,
    )
    return await _persist(
        db, actor, correction, "report.corrected", observation=payload.observation
    )


# --- Worker (consumidor de la cola) --------------------------------------

Storage = Callable[[TechnicalReport], Awaitable[str]]


async def _pdf_unconfigured(_report: TechnicalReport) -> str:
    # TODO(TBD): render de PDF + almacenamiento privado R2 con URL firmada.
    raise NotImplementedError("Generación/almacenamiento de PDF pendiente (R2)")


async def generate_pending_pdf(
    db: AsyncSession,
    worker_id: str,
    *,
    store: Storage = _pdf_unconfigured,
    now: datetime | None = None,
) -> Job | None:
    """Un ciclo del worker: reclama un ``informe.pdf``, genera y almacena el PDF
    del informe aprobado y marca la tarea. Devuelve la tarea procesada o ``None``.
    Idempotente: el puntero al PDF se escribe sobre la versión aprobada inmutable."""
    now = now or datetime.now(UTC)
    job = await queue.claim(db, worker_id, kinds=[PDF_JOB], now=now)
    if job is None:
        await db.rollback()
        return None
    job_id, report_id = job.id, job.payload["report_id"]
    await db.commit()  # persiste el reclamo (attempts++) antes del trabajo lento
    try:
        report = await db.get(TechnicalReport, report_id)
        if report is None or report.status != "aprobado":
            await queue.complete(db, job_id)  # tarea envenenada: no reintentar
        else:
            report.pdf_storage_key = await store(report)
            report.pdf_generated_at = now
            await db.flush()
            await queue.complete(db, job_id)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        await queue.fail(db, job_id, str(exc))
        await db.commit()
    return job
