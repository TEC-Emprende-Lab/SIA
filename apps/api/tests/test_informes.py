"""Informe técnico: fuentes trazables, aprobación humana, inmutabilidad y worker PDF."""

import os
import runpy
from datetime import UTC, date, datetime
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import Header
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.main import create_app
from app.models.comunicacion import Agreement, Meeting, Minutes
from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramEnrollment,
)
from app.models.informes import TechnicalReport
from app.models.queue import Job
from app.models.seguimiento import (
    Activity,
    CanvasArea,
    CycleCanvas,
    Evidence,
    Objective,
    ProgramCanvas,
)
from app.models.user import User
from app.modules.informes import service
from app.security.deps import get_current_user

PERIOD = {"period_start": "2026-09-01", "period_end": "2026-09-30"}
IN_PERIOD = datetime(2026, 9, 15, 10, tzinfo=UTC)


def migrate(connection, direction):
    files = sorted((Path(__file__).resolve().parents[1] / "alembic/versions").glob("00*.py"))
    if direction == "downgrade":
        files.reverse()
    with Operations.context(MigrationContext.configure(connection)):
        for file in files:
            runpy.run_path(str(file))[direction]()


@pytest.fixture
async def reports():
    url = os.getenv("INFORMES_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = create_async_engine(url)
    if url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(migrate, "upgrade")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        for uid, role in [
            ("coord", "Coordinadora"),
            ("manager", "Gestor"),
            ("founder", "Emprendedor"),
            ("outside", "Gestor"),
        ]:
            db.add(User(id=uid, email=f"{uid}@test.example", role=role))
        db.add(Entrepreneurship(id="e1", name="Uno"))
        await db.flush()
        db.add(ProgramEnrollment(id="p1", entrepreneurship_id="e1", program="Prototipado"))
        await db.flush()
        db.add(ProgramCycle(id="c1", enrollment_id="p1", name="c1"))
        db.add(
            EntrepreneurshipAssignment(entrepreneurship_id="e1", user_id="manager", role="Gestor")
        )
        db.add(
            EntrepreneurshipAssignment(
                entrepreneurship_id="e1", user_id="founder", role="Emprendedor"
            )
        )
        await db.flush()
        # Fuentes de seguimiento (objetivo aprobado -> actividad completada -> evidencia).
        # El canvas v1 de Prototipado y sus áreas ya vienen sembrados por la migración 003.
        canvas = await db.scalar(
            select(ProgramCanvas).where(
                ProgramCanvas.program == "Prototipado", ProgramCanvas.version == 1
            )
        )
        area = await db.scalar(
            select(CanvasArea)
            .where(CanvasArea.canvas_id == canvas.id)
            .order_by(CanvasArea.position)
        )
        db.add(CycleCanvas(cycle_id="c1", canvas_id=canvas.id, entrepreneurship_id="e1"))
        await db.flush()
        db.add(
            Objective(
                id="ob",
                cycle_id="c1",
                canvas_id=canvas.id,
                entrepreneurship_id="e1",
                area_id=area.id,
                title="Objetivo",
                status="approved",
                deliverable="Entregable",
            )
        )
        await db.flush()
        db.add(
            Activity(
                id="ac",
                cycle_id="c1",
                objective_id="ob",
                responsible_id="founder",
                title="Actividad",
                starts_on=date(2026, 9, 1),
                ends_on=date(2026, 9, 20),
                completed_at=IN_PERIOD,
            )
        )
        await db.flush()
        db.add(
            Evidence(
                id="ev",
                cycle_id="c1",
                activity_id="ac",
                title="Evidencia",
                kind="link",
                url="https://example.org/e",
                created_by="founder",
            )
        )
        # Fuentes de comunicación (reunión en el período -> minuta aprobada + acuerdo).
        db.add(
            Meeting(
                id="mt",
                cycle_id="c1",
                title="Reunión",
                scheduled_at=IN_PERIOD,
                participants=["Ana"],
                created_by="manager",
            )
        )
        await db.flush()
        db.add(
            Minutes(
                id="mn",
                meeting_id="mt",
                content="Acta",
                origin="manual",
                status="aprobada",
                reviewed_by="manager",
                approved_at=IN_PERIOD,
                created_by="manager",
            )
        )
        db.add(
            Agreement(
                id="ag",
                meeting_id="mt",
                description="Acuerdo",
                responsible_id="founder",
                due_date=date(2026, 10, 1),
                next_steps="",
                created_by="manager",
            )
        )
        await db.commit()
    app = create_app()

    async def database():
        async with sessions() as db:
            yield db

    async def actor(x_actor: str = Header(default="manager")):
        async with sessions() as db:
            return await db.get(User, x_actor)

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = actor
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client, sessions
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(migrate, "downgrade")
        await engine.dispose()


def headers(actor):
    return {"x-actor": actor}


async def create(client, actor="manager", **overrides):
    return await client.post(
        "/cycles/c1/reports", headers=headers(actor), json={**PERIOD, **overrides}
    )


async def approve(client, report_id, actor="manager", revision=1, **overrides):
    return await client.post(
        f"/cycles/c1/reports/{report_id}/approval",
        headers=headers(actor),
        json={
            "expected_revision": revision,
            "observation": "Revisado",
            "human_reviewed": True,
            **overrides,
        },
    )


async def test_create_composes_traceable_sources_and_marks_finances_pending(reports):
    client, _ = reports
    created = await create(client)
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["status"] == "borrador" and data["version"] == 1
    comp = data["composition"]
    assert [o["id"] for o in comp["objectives"]] == ["ob"]
    assert [a["id"] for a in comp["activities_completed"]] == ["ac"]
    assert [e["id"] for e in comp["evidence"]] == ["ev"]
    assert [m["id"] for m in comp["minutes_approved"]] == ["mn"]
    assert [g["id"] for g in comp["agreements"]] == ["ag"]
    assert comp["finances"]["status"] == "Pendiente de completar"


async def test_only_managers_send_review_and_approve(reports):
    client, _ = reports
    assert (await create(client, actor="founder")).status_code == 403
    assert (await create(client, actor="outside")).status_code == 403
    report_id = (await create(client)).json()["id"]
    assert (await approve(client, report_id, actor="founder")).status_code == 403
    assert (await approve(client, report_id, human_reviewed=False)).status_code == 422


async def test_approval_snapshots_enqueues_pdf_and_is_immutable(reports):
    client, sessions = reports
    report_id = (await create(client)).json()["id"]
    approved = await approve(client, report_id)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "aprobado" and approved.json()["reviewed_by"] == "manager"
    assert approved.json()["approved_at"]
    # PDF encolado, idempotente, sin generarse todavía.
    async with sessions() as db:
        job = await db.scalar(select(Job).where(Job.idempotency_key == f"informe-pdf:{report_id}"))
        assert job is not None and job.kind == "informe.pdf" and job.status == "pending"
        report = await db.get(TechnicalReport, report_id)
        assert report.pdf_storage_key is None
        report.narrative = "alterado"
        with pytest.raises(ValueError):
            await db.flush()
        await db.rollback()
    # Ya aprobado: no se edita ni se re-aprueba por la API.
    assert (
        await client.put(
            f"/cycles/c1/reports/{report_id}",
            json={"expected_revision": 2, "observation": "x", "narrative": "y"},
        )
    ).status_code == 409
    assert (await approve(client, report_id, revision=2)).status_code == 409


async def test_correction_creates_linked_next_version(reports):
    client, _ = reports
    report_id = (await create(client)).json()["id"]
    await approve(client, report_id)
    correction = await client.post(
        f"/cycles/c1/reports/{report_id}/corrections", json={"observation": "Ajuste"}
    )
    assert correction.status_code == 201, correction.text
    data = correction.json()
    assert (
        data["version"] == 2 and data["supersedes_id"] == report_id and data["status"] == "borrador"
    )
    # No se corrige un borrador (solo lo aprobado).
    assert (
        await client.post(
            f"/cycles/c1/reports/{data['id']}/corrections", json={"observation": "no"}
        )
    ).status_code == 409
    # Corregir de nuevo la aprobada original no colisiona: versión = máx + 1.
    again = await client.post(
        f"/cycles/c1/reports/{report_id}/corrections", json={"observation": "Otra"}
    )
    assert again.status_code == 201 and again.json()["version"] == 3


async def test_worker_generates_pdf_then_idle(reports):
    client, sessions = reports
    report_id = (await create(client)).json()["id"]
    await approve(client, report_id)

    async def fake_store(report):
        return f"r2://informes/{report.id}.pdf"

    async with sessions() as db:
        job = await service.generate_pending_pdf(db, "w1", store=fake_store)
        assert job is not None
    async with sessions() as db:
        report = await db.get(TechnicalReport, report_id)
        assert report.pdf_storage_key == f"r2://informes/{report_id}.pdf"
        assert report.pdf_generated_at is not None
        done = await db.scalar(select(Job).where(Job.idempotency_key == f"informe-pdf:{report_id}"))
        assert done.status == "done"
    # Sin más tareas pendientes.
    async with sessions() as db:
        assert await service.generate_pending_pdf(db, "w1", store=fake_store) is None


async def test_worker_failure_retries_without_writing_pdf(reports):
    client, sessions = reports
    report_id = (await create(client)).json()["id"]
    await approve(client, report_id)

    async def broken_store(_report):
        raise RuntimeError("R2 caído")

    async with sessions() as db:
        await service.generate_pending_pdf(db, "w1", store=broken_store)
    async with sessions() as db:
        job = await db.scalar(select(Job).where(Job.idempotency_key == f"informe-pdf:{report_id}"))
        assert job.status == "pending" and job.attempts == 1 and job.last_error
        report = await db.get(TechnicalReport, report_id)
        assert report.pdf_storage_key is None


async def test_invalid_period_and_authentication(reports):
    client, _ = reports
    assert (
        await create(client, period_start="2026-09-30", period_end="2026-09-01")
    ).status_code == 422
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as anon:
        assert (await anon.get("/cycles/c1/reports")).status_code == 401
