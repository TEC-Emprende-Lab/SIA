"""US-PRO-004 / US-PM-003: authorized, traceable sources and common chat rules."""

import asyncio
import os
import runpy
from datetime import UTC, datetime
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import Header
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.main import create_app
from app.models.audit import AuditLog
from app.models.comunicacion import Alert, Channel, Mention, Message, Notification
from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.user import User
from app.modules.comunicacion import service
from app.security.deps import get_current_user


def migrate(connection, direction):
    files = sorted((Path(__file__).resolve().parents[1] / "alembic/versions").glob("00*.py"))
    if direction == "downgrade":
        files.reverse()
    with Operations.context(MigrationContext.configure(connection)):
        for file in files:
            runpy.run_path(str(file))[direction]()


@pytest.fixture
async def communication():
    url = os.getenv("COMUNICACION_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
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
            ("scoped", "Gestor"),
            ("member", "Emprendedor"),
            ("outside", "Gestor"),
            ("wrong", "Emprendedor"),
        ]:
            db.add(User(id=uid, email=f"{uid}@test.example", role=role))
        db.add_all([Entrepreneurship(id="e1", name="Uno"), Entrepreneurship(id="e2", name="Dos")])
        await db.flush()
        for pid, eid, program in [
            ("p1", "e1", "Prototipado"),
            ("p2", "e2", "Prototipado"),
            ("p3", "e1", "Puesta en marcha"),
        ]:
            db.add(ProgramEnrollment(id=pid, entrepreneurship_id=eid, program=program))
        await db.flush()
        for cid, pid in [("c1", "p1"), ("c2", "p1"), ("c3", "p2"), ("c4", "p3")]:
            db.add(ProgramCycle(id=cid, enrollment_id=pid, name=cid))
        await db.flush()
        for uid, role in [("manager", "Gestor"), ("founder", "Emprendedor")]:
            db.add(EntrepreneurshipAssignment(entrepreneurship_id="e1", user_id=uid, role=role))
        for uid, role in [("scoped", "Gestor"), ("member", "Emprendedor"), ("wrong", "Gestor")]:
            db.add(ProgramCycleAssignment(program_cycle_id="c1", user_id=uid, role=role))
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


async def new_meeting(client, cycle="c1", actor="manager"):
    result = await client.post(
        f"/cycles/{cycle}/meetings",
        headers=headers(actor),
        json={
            "title": "Revisión",
            "scheduled_at": "2026-09-16T10:00:00Z",
            "participants": ["Ana", "Invitado externo"],
            "reference_url": "https://meet.google.com/example",
        },
    )
    assert result.status_code == 201, result.text
    return f"/cycles/{cycle}/meetings/{result.json()['id']}"


async def new_channel(client, cycle="c1"):
    result = await client.post(
        "/channels", json={"entrepreneurship_id": "e1", "cycle_id": cycle, "name": "Consultas"}
    )
    assert result.status_code == 201, result.text
    return f"/channels/{result.json()['id']}"


@pytest.mark.parametrize("cycle", ["c1", "c4"])
async def test_meetings_minutes_human_review_and_immutability(communication, cycle):
    client, sessions = communication
    path = await new_meeting(client, cycle)
    draft = await client.post(
        path + "/minutes/drafts", json={"transcript": "Ana acordó revisar el prototipo."}
    )
    assert draft.status_code == 201, draft.text
    data = draft.json()
    assert data["origin"] == "ia_borrador"
    assert data["source_transcript"] in data["content"]
    assert data["status"] == "borrador"
    minutes = path + "/minutes/" + data["id"]
    assert (await client.get(path + "/minutes", headers=headers("founder"))).json() == []
    approval = {
        "expected_revision": 1,
        "observation": "Texto contrastado con fuente",
        "human_reviewed": True,
    }
    assert (
        await client.post(minutes + "/approval", json=approval, headers=headers("founder"))
    ).status_code == 403
    assert (
        await client.post(minutes + "/approval", json={**approval, "human_reviewed": False})
    ).status_code == 422
    approved = await client.post(minutes + "/approval", json=approval)
    assert approved.status_code == 200, approved.text
    assert approved.json()["reviewed_by"] == "manager"
    assert len((await client.get(path + "/minutes", headers=headers("founder"))).json()) == 1
    assert (
        await client.put(
            minutes, json={"expected_revision": 2, "observation": "cambio", "content": "Otro texto"}
        )
    ).status_code == 409
    assert (
        await client.post(minutes + "/approval", json={**approval, "expected_revision": 2})
    ).status_code == 409
    async with sessions() as db:
        with pytest.raises(DBAPIError):
            await db.execute(
                text("UPDATE meeting_minutes SET content = :content WHERE id = :id"),
                {"content": "Alterado", "id": data["id"]},
            )
        await db.rollback()
        log = await db.scalar(select(AuditLog).where(AuditLog.action == "minutes.approved"))
        assert log.actor_id == "manager" and log.created_at
        assert log.after["observation"] == approval["observation"]


@pytest.mark.parametrize("actor", ["outside", "wrong"])
async def test_unauthorized_roles_and_scopes(communication, actor):
    client, _ = communication
    assert (await client.get("/cycles/c1/meetings", headers=headers(actor))).status_code == 403
    assert (
        await client.get("/channels?entrepreneurship_id=e1&cycle_id=c1", headers=headers(actor))
    ).status_code == 403


async def test_exact_cycle_shared_scope_and_cross_links(communication):
    client, _ = communication
    path = await new_meeting(client, actor="scoped")
    assert (await client.get("/cycles/c2/meetings", headers=headers("scoped"))).status_code == 403
    assert (await client.get(path.replace("/c1/", "/c2/"))).status_code == 404
    assert (
        await client.get("/channels?entrepreneurship_id=e1", headers=headers("scoped"))
    ).status_code == 403
    assert (
        await client.post(
            "/channels",
            headers=headers("scoped"),
            json={"entrepreneurship_id": "e1", "name": "shared"},
        )
    ).status_code == 403
    assert (
        await client.post(
            "/channels",
            headers=headers("coord"),
            json={"entrepreneurship_id": "e2", "cycle_id": "c1", "name": "cruce"},
        )
    ).status_code == 404
    shared = await new_channel(client, None)
    assert (await client.get(shared + "/messages", headers=headers("founder"))).status_code == 200
    assert (await client.get(shared + "/messages", headers=headers("member"))).status_code == 403
    assert (
        await client.post(
            "/cycles/c1/meetings",
            headers=headers("founder"),
            json={"title": "x", "scheduled_at": "2026-09-16T10:00:00Z", "participants": []},
        )
    ).status_code == 403


async def test_agreements_responsibility_and_revision(communication):
    client, _ = communication
    path = await new_meeting(client)
    data = {
        "description": "Validar prototipo",
        "responsible_id": "member",
        "due_date": "2026-10-01",
        "next_steps": "Recoger evidencia",
    }
    assert (
        await client.post(path + "/agreements", json={**data, "responsible_id": "outside"})
    ).status_code == 422
    created = await client.post(path + "/agreements", json=data)
    assert created.status_code == 201, created.text
    url = path + "/agreements/" + created.json()["id"]
    update = {
        **data,
        "description": "Validar con usuarios",
        "expected_revision": 1,
        "observation": "Precisión",
    }
    assert (await client.put(url, json=update)).status_code == 200
    assert (await client.put(url, json=update)).status_code == 409
    other = await new_meeting(client, "c2")
    assert (
        await client.put(
            other + "/agreements/" + created.json()["id"], json={**update, "expected_revision": 2}
        )
    ).status_code == 404


async def test_messages_mentions_receipts_notifications_and_history(communication):
    client, sessions = communication
    channel = await new_channel(client)
    bad = await client.post(
        channel + "/messages", json={"content": "Hola", "mentioned_user_ids": ["outside"]}
    )
    assert bad.status_code == 422
    assert (await client.get(channel + "/messages")).json() == []
    created = await client.post(
        channel + "/messages",
        json={"content": "Hola Ana", "mentioned_user_ids": ["member", "member"]},
    )
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["mentioned_user_ids"] == ["member"]
    assert (await client.get(channel + "/unread", headers=headers("member"))).json()["count"] == 1
    alerts = (await client.get("/alerts", headers=headers("member"))).json()
    assert len(alerts) == 1 and alerts[0]["cycle_id"] == "c1"
    assert (await client.get("/alerts")).json() == []
    notifications = (await client.get("/notifications", headers=headers("member"))).json()
    notification_path = "/notifications/" + notifications[0]["id"] + "/read"
    assert (await client.put(notification_path)).status_code == 404
    assert (await client.put(notification_path, headers=headers("member"))).status_code == 200
    assert (await client.put(notification_path, headers=headers("member"))).status_code == 200
    receipt = await client.put(
        channel + "/read-receipt",
        headers=headers("member"),
        json={"last_read_message_id": data["id"]},
    )
    assert receipt.status_code == 200, receipt.text
    assert (await client.get(channel + "/unread", headers=headers("member"))).json()["count"] == 0
    revision = {"expected_revision": 1, "observation": "Corrección", "content": "Hola de nuevo"}
    message_path = channel + "/messages/" + data["id"]
    assert (
        await client.put(message_path, headers=headers("member"), json=revision)
    ).status_code == 403
    assert (await client.put(message_path, json=revision)).status_code == 200
    assert (await client.put(message_path, json=revision)).status_code == 409
    removed = await client.request(
        "DELETE", message_path, json={"expected_revision": 2, "observation": "Retirado por autor"}
    )
    assert removed.status_code == 200 and removed.json()["content"] is None
    assert (await client.get(channel + "/messages")).json()[0]["content"] is None
    async with sessions() as db:
        message = await db.get(Message, data["id"])
        assert message.content == "Hola de nuevo" and message.revoked_at
        assert await db.scalar(select(func.count()).select_from(Mention)) == 1
        log = await db.scalar(select(AuditLog).where(AuditLog.action == "message.revoked"))
        assert log.before["content"] == "Hola de nuevo" and log.actor_id == "manager"


async def test_receipts_are_monotonic_and_cannot_cross_channels(communication):
    client, _ = communication
    channel = await new_channel(client)
    other = await new_channel(client)
    first = (await client.post(channel + "/messages", json={"content": "Primero"})).json()
    second = (await client.post(channel + "/messages", json={"content": "Segundo"})).json()
    foreign = (await client.post(other + "/messages", json={"content": "Otro"})).json()
    mark = channel + "/read-receipt"
    assert (await client.put(mark, json={"last_read_message_id": foreign["id"]})).status_code == 404
    assert (await client.put(mark, json={"last_read_message_id": second["id"]})).status_code == 200
    result = await client.put(mark, json={"last_read_message_id": first["id"]})
    assert result.json()["last_read_message_id"] == second["id"]


@pytest.mark.parametrize(
    "actor,model", [("member", ProgramCycleAssignment), ("founder", EntrepreneurshipAssignment)]
)
async def test_revocation_hides_history_and_inbox_without_deletion(communication, actor, model):
    client, sessions = communication
    channel = await new_channel(client)
    await client.post(
        channel + "/messages", json={"content": "Aviso", "mentioned_user_ids": [actor]}
    )
    notification = (await client.get("/notifications", headers=headers(actor))).json()[0]
    async with sessions() as db:
        assignment = await db.scalar(select(model).where(model.user_id == actor))
        assignment.revoked_at = datetime.now(UTC)
        await db.commit()
    assert (await client.get(channel + "/messages", headers=headers(actor))).status_code == 403
    assert (await client.get("/alerts", headers=headers(actor))).json() == []
    assert (await client.get("/notifications", headers=headers(actor))).json() == []
    assert (
        await client.put("/notifications/" + notification["id"] + "/read", headers=headers(actor))
    ).status_code == 403
    assert (
        await client.post(
            channel + "/messages", json={"content": "Aviso", "mentioned_user_ids": [actor]}
        )
    ).status_code == 422
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(Notification)) == 1
        db.add(ProgramCycleAssignment(program_cycle_id="c1", user_id=actor, role="Emprendedor"))
        await db.commit()
    assert len((await client.get("/alerts", headers=headers(actor))).json()) == 1


async def test_transaction_rollback_on_audit_failure(communication, monkeypatch):
    client, sessions = communication
    channel = await new_channel(client)

    async def fail(*args, **kwargs):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(service, "write_audit", fail)
    with pytest.raises(RuntimeError):
        await client.post(
            channel + "/messages", json={"content": "No guardar", "mentioned_user_ids": ["member"]}
        )
    async with sessions() as db:
        for model in [Message, Mention, Alert, Notification]:
            assert await db.scalar(select(func.count()).select_from(model)) == 0


async def test_migration_guards_and_historical_meetings(communication):
    client, sessions = communication
    path = await new_meeting(client)
    channel = await new_channel(client)
    minutes = (await client.post(path + "/minutes", json={"content": "Manual"})).json()
    result = await client.request(
        "DELETE", path, json={"expected_revision": 1, "observation": "Cancelada"}
    )
    assert result.status_code == 200 and result.json()["revoked_at"]
    assert (await client.get(path)).status_code == 200
    assert (await client.post(path + "/minutes", json={"content": "Nuevo"})).status_code == 409
    async with sessions() as db:
        for sql, params in [
            ("DELETE FROM meeting_minutes WHERE id=:id", {"id": minutes["id"]}),
            (
                "UPDATE channels SET cycle_id=:cycle WHERE id=:id",
                {"id": channel.rsplit("/", 1)[1], "cycle": "c3"},
            ),
        ]:
            with pytest.raises(DBAPIError):
                await db.execute(text(sql), params)
            await db.rollback()
        db.add(
            Channel(entrepreneurship_id="e2", cycle_id="c1", name="Inválido", created_by="coord")
        )
        with pytest.raises(DBAPIError):
            await db.flush()
        await db.rollback()


async def test_pagination_and_untrusted_fields(communication):
    client, _ = communication
    channel = await new_channel(client)
    assert (
        await client.post(channel + "/messages", json={"content": " ", "created_by": "coord"})
    ).status_code == 422
    for value in ["a", "b", "c"]:
        assert (
            await client.post(channel + "/messages", json={"content": value})
        ).status_code == 201
    result = await client.get(channel + "/messages?offset=1&limit=1")
    assert [row["content"] for row in result.json()] == ["b"]
    assert (await client.get(channel + "/messages?limit=101")).status_code == 422


async def test_real_router_requires_authentication():
    async with AsyncClient(
        transport=ASGITransport(app=create_app()), base_url="http://test"
    ) as client:
        for path in [
            "/cycles/c1/meetings",
            "/channels?entrepreneurship_id=e1",
            "/alerts",
            "/notifications",
        ]:
            assert (await client.get(path)).status_code == 401


@pytest.mark.skipif(
    not os.getenv("COMUNICACION_TEST_DATABASE_URL", "").startswith("postgresql"),
    reason="Requires disposable PostgreSQL",
)
async def test_concurrent_approval_and_edit(communication):
    client, _ = communication
    path = await new_meeting(client)
    minutes = (await client.post(path + "/minutes", json={"content": "Original"})).json()
    url = path + "/minutes/" + minutes["id"]
    results = await asyncio.gather(
        client.post(
            url + "/approval",
            json={"expected_revision": 1, "observation": "Revisado", "human_reviewed": True},
        ),
        client.put(
            url, json={"expected_revision": 1, "observation": "Editado", "content": "Cambio"}
        ),
    )
    assert sorted(result.status_code for result in results) == [200, 409]
