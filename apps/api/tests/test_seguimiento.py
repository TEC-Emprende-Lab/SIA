"""Acceptance: US-PRO-001/002/005/006 and US-PM-001/002.

The router is mounted on an isolated app: production integration is owned by
the coordinating agent. Set SEGUIMIENTO_TEST_DATABASE_URL for real PostgreSQL.
"""

import asyncio
import os
import runpy
from copy import deepcopy
from datetime import UTC, date, datetime
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import FastAPI, Header
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.seguimiento import (
    Activity,
    Ambition,
    Diagnostic,
    Evidence,
    Objective,
    Validation,
)
from app.models.user import User
from app.modules.seguimiento import service
from app.modules.seguimiento.definitions import AREAS, definition_id
from app.modules.seguimiento.policy import Scope, has_access
from app.modules.seguimiento.routes import router
from app.schemas.seguimiento import ObjectiveCreate
from app.security.deps import get_current_user


def migrate(connection, direction):
    versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    files = ["001_initial_identity.py", "002_expediente.py", "003_seguimiento.py"]
    if direction == "downgrade":
        files.reverse()
    with Operations.context(MigrationContext.configure(connection)):
        for filename in files:
            runpy.run_path(str(versions / filename))[direction]()


@pytest.fixture
async def tracking():
    url = os.getenv("SEGUIMIENTO_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = create_async_engine(url)
    if url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(migrate, "upgrade")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        for user_id, role in [
            ("coordinator", "Coordinadora"),
            ("manager", "Gestor"),
            ("founder", "Emprendedor"),
            ("cycle-manager", "Gestor"),
            ("cycle-founder", "Emprendedor"),
            ("outsider", "Gestor"),
            ("wrong-role", "Emprendedor"),
        ]:
            db.add(User(id=user_id, email=f"{user_id}@example.test", role=role))
        db.add_all([Entrepreneurship(id="e1", name="Uno"), Entrepreneurship(id="e2", name="Dos")])
        await db.flush()
        for enrollment_id, entrepreneurship_id, program in [
            ("p1", "e1", "Prototipado"),
            ("p2", "e1", "Puesta en marcha"),
            ("p3", "e2", "Prototipado"),
        ]:
            db.add(
                ProgramEnrollment(
                    id=enrollment_id, entrepreneurship_id=entrepreneurship_id, program=program
                )
            )
        await db.flush()
        for cycle_id, enrollment in [("c1", "p1"), ("c2", "p1"), ("c3", "p2"), ("c4", "p3")]:
            db.add(ProgramCycle(id=cycle_id, enrollment_id=enrollment, name=cycle_id))
        await db.flush()
        for user_id, role in [("manager", "Gestor"), ("founder", "Emprendedor")]:
            db.add(EntrepreneurshipAssignment(entrepreneurship_id="e1", user_id=user_id, role=role))
        for user_id, role in [
            ("cycle-manager", "Gestor"),
            ("cycle-founder", "Emprendedor"),
            ("wrong-role", "Gestor"),
        ]:
            db.add(ProgramCycleAssignment(program_cycle_id="c1", user_id=user_id, role=role))
        await db.commit()
    app = FastAPI()
    app.include_router(router)

    async def database():
        async with sessions() as session:
            yield session

    async def actor(x_actor: str = Header(default="founder")):
        async with sessions() as session:
            return await session.get(User, x_actor)

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_user] = actor
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, sessions
    async with engine.begin() as conn:
        await conn.run_sync(migrate, "downgrade")
    await engine.dispose()


def path(resource, cycle="c1"):
    return f"/cycles/{cycle}/seguimiento/{resource}"


def objective_data(**changes):
    return {"title": "Validar solución", "area_id": definition_id("Prototipado", "mvp"), **changes}


@pytest.mark.parametrize("actor", ["manager", "founder", "cycle-manager", "cycle-founder"])
async def test_revoked_membership_denies_tracking_and_active_alternative_restores_access(
    tracking, actor
):
    client, sessions = tracking
    direct = not actor.startswith("cycle-")
    model = EntrepreneurshipAssignment if direct else ProgramCycleAssignment
    async with sessions() as db:
        assignment = await db.scalar(select(model).where(model.user_id == actor))
        assignment.revoked_at = datetime.now(UTC)
        assignment.revoked_by = "coordinator"
        await db.commit()
        user = await db.get(User, actor)
        assert not await has_access(db, user, Scope("c1", "e1", "Prototipado"))
    headers = {"x-actor": actor}
    assert (await client.get(path("objectives"), headers=headers)).status_code == 403
    assert (
        await client.post(path("objectives"), headers=headers, json=objective_data())
    ).status_code == 403
    async with sessions() as db:
        user = await db.get(User, actor)
        db.add(ProgramCycleAssignment(program_cycle_id="c1", user_id=actor, role=user.role))
        await db.commit()
        assert await has_access(db, user, Scope("c1", "e1", "Prototipado"))
    assert (await client.get(path("objectives"), headers=headers)).status_code == 200


async def create_objective(client, cycle="c1", actor="founder", **changes):
    result = await client.post(
        path("objectives", cycle), json=objective_data(**changes), headers={"x-actor": actor}
    )
    assert result.status_code == 201, result.text
    return result.json()


async def create_activity(client, objective, cycle="c1", **changes):
    result = await client.post(
        path("activities", cycle),
        json={
            "title": "Prueba con usuarios",
            "objective_id": objective["id"],
            "responsible_id": "founder",
            "starts_on": "2026-09-01",
            "ends_on": "2026-09-15",
            **changes,
        },
    )
    assert result.status_code == 201, result.text
    return result.json()


async def current(client, resource, entity_id, cycle="c1"):
    result = await client.get(path(resource, cycle))
    assert result.status_code == 200, result.text
    return next(row for row in result.json() if row["id"] == entity_id)


async def approve(client, resource, entity_id, cycle="c1", actor="manager"):
    entity = await current(client, resource, entity_id, cycle)
    if entity["status"] != "pending_validation":
        result = await client.post(
            path(f"{resource}/{entity_id}/submit", cycle),
            json={"expected_revision": entity["revision"]},
        )
        assert result.status_code == 200, result.text
        entity = result.json()
    result = await client.post(
        path(f"{resource}/{entity_id}/validations", cycle),
        json={
            "expected_revision": entity["revision"],
            "decision": "approve",
            "observation": "Revisado",
        },
        headers={"x-actor": actor},
    )
    assert result.status_code == 201, result.text
    return result.json()


@pytest.mark.parametrize("cycle,program", [("c1", "Prototipado"), ("c3", "Puesta en marcha")])
async def test_official_canvas_and_program_objectives(tracking, cycle, program):
    client, _ = tracking
    result = await client.get(path("canvas", cycle))
    assert result.status_code == 200
    canvas = result.json()
    assert canvas["version"] == 1 and canvas["program"] == program
    assert [area["name"] for area in canvas["areas"]] == [area[1] for area in AREAS[program]]
    obj = await create_objective(client, cycle, area_id=canvas["areas"][0]["id"])
    assert obj["canvas_id"] == canvas["id"]
    await create_activity(client, obj, cycle)
    await approve(client, "objectives", obj["id"], cycle)
    assert (await client.get(path("schedule", cycle))).json()[0]["objective_id"] == obj["id"]
    # There is no configuration capability, even for the global coordinator.
    assert (
        await client.post(path("canvas", cycle), json={}, headers={"x-actor": "coordinator"})
    ).status_code == 405


@pytest.mark.parametrize(
    "resource",
    [
        "canvas",
        "ambitions",
        "objectives",
        "activities",
        "evidence",
        "diagnostics",
        "validations",
        "schedule",
    ],
)
async def test_all_reads_authorize_cycle_without_sibling_escalation(tracking, resource):
    client, _ = tracking
    for actor in ("cycle-manager", "cycle-founder"):
        assert (await client.get(path(resource), headers={"x-actor": actor})).status_code == 200
        for cycle in ("c2", "c3", "c4"):
            assert (
                await client.get(path(resource, cycle), headers={"x-actor": actor})
            ).status_code == 403
    for actor in ("outsider", "wrong-role"):
        assert (await client.get(path(resource), headers={"x-actor": actor})).status_code == 403
    assert (
        await client.get(path(resource, "c4"), headers={"x-actor": "coordinator"})
    ).status_code == 200


async def test_mutations_scope_and_validator_roles(tracking):
    client, _ = tracking
    for actor in ("outsider", "wrong-role"):
        assert (
            await client.post(path("objectives"), json=objective_data(), headers={"x-actor": actor})
        ).status_code == 403
    assert (
        await client.post(
            path("objectives", "c2"), json=objective_data(), headers={"x-actor": "cycle-manager"}
        )
    ).status_code == 403
    obj = await create_objective(client, actor="cycle-founder")
    await create_activity(client, obj)
    obj = await current(client, "objectives", obj["id"])
    submitted = await client.post(
        path(f"objectives/{obj['id']}/submit"), json={"expected_revision": obj["revision"]}
    )
    data = {
        "expected_revision": submitted.json()["revision"],
        "decision": "approve",
        "observation": "OK",
    }
    for actor in ("founder", "cycle-founder", "outsider"):
        response = await client.post(
            path(f"objectives/{obj['id']}/validations"), json=data, headers={"x-actor": actor}
        )
        assert response.status_code == 403
    assert (
        await client.post(
            path(f"objectives/{obj['id']}/validations"),
            json=data,
            headers={"x-actor": "cycle-manager"},
        )
    ).status_code == 201
    # Approval cannot be replayed, even by coordinator.
    assert (
        await client.post(
            path(f"objectives/{obj['id']}/validations"),
            json=data,
            headers={"x-actor": "coordinator"},
        )
    ).status_code == 409


async def test_cross_scope_references_and_optional_ambitions(tracking):
    client, _ = tracking
    ambition = (await client.post(path("ambitions"), json={"title": "Aspiración"})).json()
    assert (await client.get(path("objectives"))).json() == []
    assert (await client.get(path("ambitions", "c3"))).json()[0]["id"] == ambition["id"]
    obj = await create_objective(client, ambition_id=ambition["id"])
    independent = await create_objective(client)
    assert independent["ambition_id"] is None
    result = await client.post(
        path("objectives", "c4"),
        json=objective_data(ambition_id=ambition["id"]),
        headers={"x-actor": "coordinator"},
    )
    assert result.status_code == 404
    assert (await client.post(path("objectives", "c3"), json=objective_data())).status_code == 422
    data = {
        "title": "Otra",
        "objective_id": obj["id"],
        "responsible_id": "founder",
        "starts_on": "2026-09-01",
        "ends_on": "2026-09-02",
    }
    assert (await client.post(path("activities", "c2"), json=data)).status_code == 404
    assert (
        await client.post(path("activities"), json={**data, "responsible_id": "outsider"})
    ).status_code == 422
    other = await create_objective(client, "c2")
    data["objective_id"] = other["id"]
    data["responsible_id"] = "cycle-founder"
    assert (await client.post(path("activities", "c2"), json=data)).status_code == 422
    activity = await create_activity(client, obj)
    evidence = {
        "title": "Prueba",
        "activity_id": activity["id"],
        "url": "https://example.test/proof",
    }
    assert (await client.post(path("evidence", "c2"), json=evidence)).status_code == 404
    assert (await client.get(path("activities", "c2"))).json() == []


async def test_revalidation_and_immutable_decision_snapshots(tracking):
    client, sessions = tracking
    obj = await create_objective(client, deliverable="Prueba piloto")
    activity = await create_activity(client, obj)
    evidence = await client.post(
        path("evidence"),
        json={
            "title": "Resultados",
            "activity_id": activity["id"],
            "url": "https://example.test/proof",
        },
    )
    assert evidence.status_code == 201
    decision = await approve(client, "objectives", obj["id"])
    frozen = deepcopy(decision["snapshot"])
    approved = await current(client, "objectives", obj["id"])
    update = objective_data(title="Nueva prueba", expected_revision=approved["revision"])
    response = await client.put(path(f"objectives/{obj['id']}"), json=update)
    assert response.status_code == 200
    assert response.json()["status"] == "pending_validation"
    # Lost updates are rejected and do not append audit events.
    async with sessions() as db:
        count = await db.scalar(select(func.count()).select_from(AuditLog))
    assert (await client.put(path(f"objectives/{obj['id']}"), json=update)).status_code == 409
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(AuditLog)) == count
        audit = (
            await db.scalars(
                select(AuditLog).where(
                    AuditLog.entity_id == obj["id"], AuditLog.action == "seguimiento.updated"
                )
            )
        ).one()
        assert (
            audit.before["status"] == "approved" and audit.after["status"] == "pending_validation"
        )
        assert audit.actor_id == "founder"
    second = await approve(client, "objectives", obj["id"], actor="coordinator")
    assert second["actor_id"] == "coordinator"
    assert second["entity_revision"] > decision["entity_revision"]
    decisions = (await client.get(path("validations"))).json()
    assert decisions[0]["snapshot"] == frozen and len(decisions) == 2
    assert frozen["activities"][0]["id"] == activity["id"]
    assert frozen["evidence"][0]["id"] == evidence.json()["id"]
    # Child mutations invalidate the reviewed aggregate too.
    result = await client.post(
        path(f"activities/{activity['id']}/completion"),
        json={
            "expected_revision": activity["revision"],
            "completed": True,
        },
    )
    assert result.status_code == 200 and result.json()["completed_at"]
    assert (await current(client, "objectives", obj["id"]))["status"] == "pending_validation"
    schedule = (await client.get(path("schedule"))).json()
    assert schedule[0]["completed_at"] == result.json()["completed_at"]
    assert (await client.get(path("validations"))).json()[0]["snapshot"] == frozen


async def test_no_approval_without_decomposition_and_correction_flow(tracking):
    client, _ = tracking
    obj = await create_objective(client)
    submitted = (
        await client.post(
            path(f"objectives/{obj['id']}/submit"), json={"expected_revision": obj["revision"]}
        )
    ).json()
    data = {"expected_revision": submitted["revision"], "decision": "approve", "observation": "OK"}
    response = await client.post(
        path(f"objectives/{obj['id']}/validations"), json=data, headers={"x-actor": "manager"}
    )
    assert response.status_code == 409
    for decision in ("request_correction", "reject"):
        data["decision"] = decision
        response = await client.post(
            path(f"objectives/{obj['id']}/validations"), json=data, headers={"x-actor": "manager"}
        )
        assert response.status_code == 201
        obj = await current(client, "objectives", obj["id"])
        submitted = await client.post(
            path(f"objectives/{obj['id']}/submit"), json={"expected_revision": obj["revision"]}
        )
        assert submitted.status_code == 200
        data["expected_revision"] = submitted.json()["revision"]


def diagnostic_data(program="Prototipado", **changes):
    return {
        "assessed_on": "2026-09-01",
        "assessments": [
            {"area_id": definition_id(program, area[0]), "observation": "Evaluación inicial"}
            for area in AREAS[program]
        ],
        **changes,
    }


async def test_diagnostics_immutable_six_areas_revisions_and_comparison(tracking):
    client, sessions = tracking
    data = diagnostic_data()
    duplicate = deepcopy(data)
    duplicate["assessments"][0] = duplicate["assessments"][1]
    assert (await client.post(path("diagnostics"), json=duplicate)).status_code == 422
    assert (await client.post(path("diagnostics", "c3"), json=data)).status_code == 422
    diagnostic = (await client.post(path("diagnostics"), json=data)).json()
    await approve(client, "diagnostics", diagnostic["id"])
    approved = await current(client, "diagnostics", diagnostic["id"])
    assert (
        await client.put(
            path(f"diagnostics/{diagnostic['id']}"),
            json={
                **data,
                "expected_revision": approved["revision"],
            },
        )
    ).status_code == 409
    revised_data = diagnostic_data(assessed_on="2026-09-15", supersedes_id=diagnostic["id"])
    revised_data["assessments"][0]["observation"] = "Nueva evaluación"
    revision = (await client.post(path("diagnostics"), json=revised_data)).json()
    compare_path = path(f"diagnostics/compare/{diagnostic['id']}/{revision['id']}")
    assert (await client.get(compare_path)).status_code == 409
    await approve(client, "diagnostics", revision["id"])
    compared = await client.get(compare_path)
    assert compared.status_code == 200
    assert compared.json()["areas"][0]["before"] == "Evaluación inicial"
    assert compared.json()["areas"][0]["after"] == "Nueva evaluación"
    assert (await current(client, "diagnostics", diagnostic["id"])) == approved
    assert (await client.post(path("diagnostics", "c2"), json=revised_data)).status_code == 404
    async with sessions() as db:
        frozen = await db.get(Diagnostic, diagnostic["id"])
        frozen.assessed_on = date(2026, 10, 1)
        with pytest.raises(ValueError, match="inmutable"):
            await db.flush()
        await db.rollback()
    async with sessions() as db:
        validation = (await db.scalars(select(Validation))).first()
        validation.observation = "Sobrescrito"
        with pytest.raises(ValueError, match="inmutable"):
            await db.flush()
        await db.rollback()


async def test_failed_audit_rolls_back_whole_mutation(tracking, monkeypatch):
    _, sessions = tracking

    async def broken_audit(*_args, **_kwargs):
        raise OSError("Simulated audit storage failure")

    monkeypatch.setattr(service, "write_audit", broken_audit)
    async with sessions() as db:
        actor = await db.get(User, "founder")
        with pytest.raises(OSError):
            await service.save(db, actor, "c1", ObjectiveCreate(**objective_data()))
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(Objective)) == 0
        assert await db.scalar(select(func.count()).select_from(AuditLog)) == 0
        assert (await db.execute(text("SELECT count(*) FROM cycle_canvases"))).scalar_one() == 0


async def test_db_rejects_cross_cycle_and_cross_entrepreneurship(tracking):
    client, sessions = tracking
    obj = await create_objective(client)
    await create_objective(client, "c2")
    async with sessions() as db:
        db.add(
            Activity(
                cycle_id="c2",
                objective_id=obj["id"],
                responsible_id="founder",
                title="Cruce",
                starts_on=date(2026, 9, 1),
                ends_on=date(2026, 9, 2),
            )
        )
        with pytest.raises(IntegrityError):
            await db.flush()
        await db.rollback()
    async with sessions() as db:
        ambition = Ambition(entrepreneurship_id="e2", title="Otra empresa")
        db.add(ambition)
        await db.flush()
        ambition_id = ambition.id
        await db.commit()
        objective = await db.get(Objective, obj["id"])
        objective.ambition_id = ambition_id
        with pytest.raises(IntegrityError):
            await db.flush()
        await db.rollback()


async def test_invalid_inputs_and_historical_relations(tracking):
    client, sessions = tracking
    assert (
        await client.post(path("objectives"), json=objective_data(title="  "))
    ).status_code == 422
    assert (
        await client.post(path("objectives"), json=objective_data(status="approved"))
    ).status_code == 422
    obj = await create_objective(client)
    activity = await create_activity(client, obj)
    other = await create_objective(client)
    update = {
        key: activity[key]
        for key in (
            "title",
            "description",
            "objective_id",
            "responsible_id",
            "starts_on",
            "ends_on",
        )
    }
    update.update(expected_revision=activity["revision"], objective_id=other["id"])
    assert (await client.put(path(f"activities/{activity['id']}"), json=update)).status_code == 409
    update["starts_on"] = "2027-01-01"
    assert (await client.put(path(f"activities/{activity['id']}"), json=update)).status_code == 422
    for url in ("javascript:alert(1)", "file:///etc/passwd", "not-a-url"):
        assert (
            await client.post(
                path("evidence"),
                json={
                    "title": "Referencia",
                    "activity_id": activity["id"],
                    "url": url,
                },
            )
        ).status_code == 422
    evidence = (
        await client.post(
            path("evidence"),
            json={
                "title": "Referencia",
                "activity_id": activity["id"],
                "url": "https://example.test/a",
            },
        )
    ).json()
    assert (await client.delete(path(f"evidence/{evidence['id']}"))).status_code == 404
    async with sessions() as db:
        stored = await db.get(Evidence, evidence["id"])
        stored.url = "https://example.test/other"
        with pytest.raises(ValueError, match="inmutable"):
            await db.flush()
        await db.rollback()


async def test_approved_noop_keeps_approval_but_evidence_and_dates_reopen(tracking):
    client, sessions = tracking
    obj = await create_objective(client)
    activity = await create_activity(client, obj)
    await approve(client, "objectives", obj["id"])
    approved = await current(client, "objectives", obj["id"])
    async with sessions() as db:
        count = await db.scalar(select(func.count()).select_from(AuditLog))
    unchanged = await client.put(
        path(f"objectives/{obj['id']}"), json=objective_data(expected_revision=approved["revision"])
    )
    assert unchanged.status_code == 200
    assert unchanged.json()["status"] == "approved"
    assert unchanged.json()["revision"] == approved["revision"]
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(AuditLog)) == count
    evidence = await client.post(
        path("evidence"),
        json={
            "title": "Resultado nuevo",
            "activity_id": activity["id"],
            "kind": "photograph",
            "url": "https://example.test/photo",
        },
    )
    assert evidence.status_code == 201
    assert (await current(client, "objectives", obj["id"]))["status"] == "pending_validation"
    await approve(client, "objectives", obj["id"])
    update = {
        key: activity[key]
        for key in (
            "title",
            "description",
            "objective_id",
            "responsible_id",
            "starts_on",
            "ends_on",
        )
    }
    update.update(expected_revision=activity["revision"], ends_on="2026-10-01")
    result = await client.put(path(f"activities/{activity['id']}"), json=update)
    assert result.status_code == 200
    assert (await client.get(path("schedule"))).json()[0]["ends_on"] == "2026-10-01"
    assert (await current(client, "objectives", obj["id"]))["status"] == "pending_validation"


async def test_mutating_existing_records_cannot_cross_cycle(tracking):
    client, _ = tracking
    obj = await create_objective(client)
    activity = await create_activity(client, obj)
    diagnostic = (await client.post(path("diagnostics"), json=diagnostic_data())).json()
    operations = [
        ("PUT", f"objectives/{obj['id']}", objective_data(expected_revision=1)),
        ("POST", f"objectives/{obj['id']}/submit", {"expected_revision": 1}),
        (
            "POST",
            f"objectives/{obj['id']}/validations",
            {"expected_revision": 1, "decision": "approve", "observation": "OK"},
        ),
        (
            "PUT",
            f"activities/{activity['id']}",
            {
                "title": "Cruce",
                "objective_id": obj["id"],
                "responsible_id": "founder",
                "starts_on": "2026-09-01",
                "ends_on": "2026-09-02",
                "expected_revision": 1,
            },
        ),
        (
            "POST",
            f"activities/{activity['id']}/completion",
            {"expected_revision": 1, "completed": True},
        ),
        ("PUT", f"diagnostics/{diagnostic['id']}", diagnostic_data(expected_revision=1)),
        ("POST", f"diagnostics/{diagnostic['id']}/submit", {"expected_revision": 1}),
        (
            "POST",
            f"diagnostics/{diagnostic['id']}/validations",
            {"expected_revision": 1, "decision": "approve", "observation": "OK"},
        ),
    ]
    for method, resource, payload in operations:
        response = await client.request(
            method, path(resource, "c2"), json=payload, headers={"x-actor": "manager"}
        )
        assert response.status_code == 404, (resource, response.text)
        denied = await client.request(
            method, path(resource, "c2"), json=payload, headers={"x-actor": "cycle-manager"}
        )
        assert denied.status_code == 403, (resource, denied.text)
    assert (await client.get(path("validations"))).json() == []


@pytest.mark.skipif(
    not os.getenv("SEGUIMIENTO_TEST_DATABASE_URL"), reason="Requires PostgreSQL row locks"
)
async def test_postgres_competing_updates_only_one_commits(tracking):
    client, _ = tracking
    obj = await create_objective(client)
    results = await asyncio.gather(
        *[
            client.put(
                path(f"objectives/{obj['id']}"),
                json=objective_data(title=f"Revisión {number}", expected_revision=obj["revision"]),
            )
            for number in range(2)
        ]
    )
    assert sorted(result.status_code for result in results) == [200, 409]


@pytest.mark.skipif(
    not os.getenv("SEGUIMIENTO_TEST_DATABASE_URL"), reason="Requires PostgreSQL triggers"
)
async def test_postgres_history_guards_and_binding_scope(tracking):
    client, sessions = tracking
    diagnostic = (await client.post(path("diagnostics"), json=diagnostic_data())).json()
    await approve(client, "diagnostics", diagnostic["id"])
    for statement, parameters in [
        (
            "UPDATE diagnostics SET assessed_on = '2026-10-01' WHERE id = :id",
            {"id": diagnostic["id"]},
        ),
        ("DELETE FROM tracking_validations", {}),
        ("UPDATE canvas_areas SET name = 'Inventada'", {}),
        (
            "INSERT INTO cycle_canvases(cycle_id, canvas_id, entrepreneurship_id) VALUES ('c2', :canvas, 'e2')",
            {"canvas": definition_id("Prototipado")},
        ),
        (
            "INSERT INTO cycle_canvases(cycle_id, canvas_id, entrepreneurship_id) VALUES ('c3', :canvas, 'e1')",
            {"canvas": definition_id("Prototipado")},
        ),
    ]:
        async with sessions() as db:
            with pytest.raises(DBAPIError):
                await db.execute(text(statement), parameters)
            await db.rollback()
