import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.security.clerk import create_test_token

settings.clerk_secret_key = "test-secret-for-expediente-at-least-32-bytes"
settings.clerk_issuer = "test-issuer"
settings.clerk_audience = "test-audience"


async def create_user(db: AsyncSession, clerk_id: str, role: str) -> User:
    user = User(clerk_user_id=clerk_id, email=f"{clerk_id}@test.cr", role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def token_for(user: User) -> str:
    return create_test_token(user.clerk_user_id or "x", user.email)


@pytest.mark.asyncio
async def test_assigned_users_can_access_only_their_entrepreneurship(db: AsyncSession):
    from httpx import ASGITransport, AsyncClient

    coordinadora = await create_user(db, "coord", "Coordinadora")
    gestor = await create_user(db, "gestor", "Gestor")
    emprendedor = await create_user(db, "emprendedor", "Emprendedor")
    outsider = await create_user(db, "outsider", "Emprendedor")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_response = await client.post(
            "/entrepreneurships",
            json={"name": "Proyecto SIA"},
            headers={"Authorization": f"Bearer {token_for(coordinadora)}"},
        )
        assert create_response.status_code == 201
        entrepreneurship_id = create_response.json()["id"]

        assign_gestor = await client.post(
            f"/entrepreneurships/{entrepreneurship_id}/assignments",
            json={"user_id": gestor.id, "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(coordinadora)}"},
        )
        assert assign_gestor.status_code == 201

        enrollment_response = await client.post(
            f"/entrepreneurships/{entrepreneurship_id}/enrollments",
            json={"program": "Prototipado", "enrolled_at": "2026-09-15T12:00:00Z"},
            headers={"Authorization": f"Bearer {token_for(gestor)}"},
        )
        assert enrollment_response.status_code == 201
        enrollment_id = enrollment_response.json()["id"]

        cycle_response = await client.post(
            f"/entrepreneurships/enrollments/{enrollment_id}/cycles",
            json={"name": "Ciclo 2026"},
            headers={"Authorization": f"Bearer {token_for(gestor)}"},
        )
        assert cycle_response.status_code == 201

        assign_emprendedor = await client.post(
            f"/entrepreneurships/{entrepreneurship_id}/assignments",
            json={"user_id": emprendedor.id, "role": "Emprendedor"},
            headers={"Authorization": f"Bearer {token_for(gestor)}"},
        )
        assert assign_emprendedor.status_code == 201

        own_response = await client.get(
            f"/entrepreneurships/{entrepreneurship_id}",
            headers={"Authorization": f"Bearer {token_for(emprendedor)}"},
        )
        denied_response = await client.get(
            f"/entrepreneurships/{entrepreneurship_id}",
            headers={"Authorization": f"Bearer {token_for(outsider)}"},
        )
    app.dependency_overrides.clear()

    assert own_response.status_code == 200
    assert denied_response.status_code == 403


@pytest.mark.asyncio
async def test_gestor_cannot_assign_another_gestor(db: AsyncSession):
    from httpx import ASGITransport, AsyncClient

    coordinadora = await create_user(db, "coord", "Coordinadora")
    gestor = await create_user(db, "gestor", "Gestor")
    other_gestor = await create_user(db, "other-gestor", "Gestor")

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_response = await client.post(
            "/entrepreneurships",
            json={"name": "Proyecto SIA"},
            headers={"Authorization": f"Bearer {token_for(coordinadora)}"},
        )
        entrepreneurship_id = create_response.json()["id"]
        await client.post(
            f"/entrepreneurships/{entrepreneurship_id}/assignments",
            json={"user_id": gestor.id, "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(coordinadora)}"},
        )
        response = await client.post(
            f"/entrepreneurships/{entrepreneurship_id}/assignments",
            json={"user_id": other_gestor.id, "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(gestor)}"},
        )
    app.dependency_overrides.clear()

    assert response.status_code == 403


@pytest.fixture
async def expediente_client(db):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.clear()


# US-PRO-001 / US-PM-001: registros del ámbito autorizado e historial persistente.
@pytest.mark.parametrize("role", ["Gestor", "Emprendedor"])
async def test_cycle_scope_never_grants_siblings_or_parent_mutations(db, expediente_client, role):
    from datetime import UTC, datetime

    from app.modules.expediente.service import (
        assign_to_cycle,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
    )

    coord = await create_user(db, "coord", "Coordinadora")
    scoped = await create_user(db, "scoped", role)
    target = await create_user(db, "target", "Emprendedor")
    enterprise = await create_entrepreneurship(db, coord, "Scoped")
    enrollment = await create_enrollment(db, coord, enterprise.id, "Prototipado", datetime.now(UTC))
    other_enrollment = await create_enrollment(
        db, coord, enterprise.id, "Prototipado", datetime.now(UTC)
    )
    own = await create_cycle(db, coord, enrollment, "Own")
    sibling = await create_cycle(db, coord, enrollment, "Sibling")
    other = await create_cycle(db, coord, other_enrollment, "Other enrollment")
    foreign_enterprise = await create_entrepreneurship(db, coord, "Foreign")
    await assign_to_cycle(db, coord, own, scoped.id, role)
    headers = {"Authorization": f"Bearer {token_for(scoped)}"}
    client = expediente_client
    assert (
        await client.get(f"/entrepreneurships/{enterprise.id}", headers=headers)
    ).status_code == 200
    assert (
        await client.get(f"/entrepreneurships/{foreign_enterprise.id}", headers=headers)
    ).status_code == 403
    for cycle, expected in [(own, 200), (sibling, 403), (other, 403)]:
        assert (
            await client.get(f"/entrepreneurships/cycles/{cycle.id}", headers=headers)
        ).status_code == expected
    listed = await client.get(
        f"/entrepreneurships/enrollments/{enrollment.id}/cycles", headers=headers
    )
    assert [row["id"] for row in listed.json()] == [own.id]
    listed_enrollments = await client.get(
        f"/entrepreneurships/{enterprise.id}/enrollments", headers=headers
    )
    assert [row["id"] for row in listed_enrollments.json()] == [enrollment.id]
    assert (
        await client.get(f"/entrepreneurships/enrollments/{other_enrollment.id}", headers=headers)
    ).status_code == 403
    assert (
        await client.get(
            f"/entrepreneurships/enrollments/{enrollment.id}/cycles?offset=1", headers=headers
        )
    ).json() == []
    for path, payload in [
        (
            f"/{enterprise.id}/enrollments",
            {"program": "Prototipado", "enrolled_at": "2026-09-15T12:00:00Z"},
        ),
        (f"/enrollments/{enrollment.id}/cycles", {"name": "Forbidden sibling"}),
        (f"/{enterprise.id}/assignments", {"user_id": target.id, "role": "Emprendedor"}),
        (f"/cycles/{sibling.id}/assignments", {"user_id": target.id, "role": "Emprendedor"}),
    ]:
        assert (
            await client.post(f"/entrepreneurships{path}", json=payload, headers=headers)
        ).status_code == 403
    own_assignment = await client.post(
        f"/entrepreneurships/cycles/{own.id}/assignments",
        json={"user_id": target.id, "role": "Emprendedor"},
        headers=headers,
    )
    assert own_assignment.status_code == (201 if role == "Gestor" else 403)
    assert (
        await client.get(f"/entrepreneurships/enrollments/{enrollment.id}", headers=headers)
    ).status_code == 200
    assert (
        await client.get(
            f"/entrepreneurships/enrollments/{other_enrollment.id}/cycles", headers=headers
        )
    ).status_code == 403
    assert [
        row["id"] for row in (await client.get("/entrepreneurships", headers=headers)).json()
    ] == [enterprise.id]
    forbidden_assignment = await client.post(
        f"/entrepreneurships/cycles/{own.id}/assignments",
        json={"user_id": scoped.id, "role": "Gestor"},
        headers=headers,
    )
    assert forbidden_assignment.status_code == 403


async def test_gestor_creation_does_not_self_assign(db, expediente_client):
    from sqlalchemy import select

    from app.models.expediente import EntrepreneurshipAssignment

    gestor = await create_user(db, "gestor", "Gestor")
    headers = {"Authorization": f"Bearer {token_for(gestor)}"}
    response = await expediente_client.post(
        "/entrepreneurships", headers=headers, json={"name": "Created"}
    )
    assert response.status_code == 201
    assert await db.scalar(select(EntrepreneurshipAssignment.id)) is None
    assert (await expediente_client.get("/entrepreneurships", headers=headers)).json() == []
    assert (
        await expediente_client.get(f"/entrepreneurships/{response.json()['id']}", headers=headers)
    ).status_code == 403


@pytest.mark.parametrize("cycle_scope", [False, True])
async def test_revocation_is_authorized_audited_and_preserves_history(
    db, expediente_client, cycle_scope
):
    from datetime import UTC, datetime

    from sqlalchemy import select

    from app.models.audit import AuditLog
    from app.modules.expediente.service import (
        assign_to_cycle,
        assign_to_entrepreneurship,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
    )

    coord = await create_user(db, "coord", "Coordinadora")
    gestor = await create_user(db, "gestor", "Gestor")
    enterprise = await create_entrepreneurship(db, coord, "History")
    enrollment = await create_enrollment(db, coord, enterprise.id, "Prototipado", datetime.now(UTC))
    cycle = await create_cycle(db, coord, enrollment, "History cycle")
    assignment = (
        await assign_to_cycle(db, coord, cycle, gestor.id, "Gestor")
        if cycle_scope
        else await assign_to_entrepreneurship(db, coord, enterprise.id, gestor.id, "Gestor")
    )
    prefix = f"/cycles/{cycle.id}" if cycle_scope else f"/{enterprise.id}"
    endpoint = f"/entrepreneurships{prefix}/assignments/{assignment.id}"
    client = expediente_client
    gestor_headers = {"Authorization": f"Bearer {token_for(gestor)}"}
    coord_headers = {"Authorization": f"Bearer {token_for(coord)}"}
    assert (await client.delete(endpoint, headers=gestor_headers)).status_code == 403
    assert (await client.delete(endpoint, headers=coord_headers)).status_code == 200
    assert (await client.delete(endpoint, headers=coord_headers)).status_code == 409
    assert (
        await client.get(f"/entrepreneurships/cycles/{cycle.id}", headers=gestor_headers)
    ).status_code == 403
    await db.refresh(assignment)
    assert assignment.revoked_at is not None
    assert await db.get(type(assignment), assignment.id) is not None
    audit = (
        await db.scalars(
            select(AuditLog).where(
                AuditLog.entity_id == assignment.id, AuditLog.action.like("%.revoked")
            )
        )
    ).one()
    assert audit.actor_id == coord.id
    assert audit.before["revoked_at"] is None
    assert audit.after["revoked_at"] is not None
    assert audit.after["user_id"] == gestor.id
    new = await client.post(
        f"/entrepreneurships{prefix}/assignments",
        headers=coord_headers,
        json={"user_id": gestor.id, "role": "Gestor"},
    )
    assert new.status_code == 201
    assert new.json()["id"] != assignment.id
    assert (
        await client.get(f"/entrepreneurships/cycles/{cycle.id}", headers=gestor_headers)
    ).status_code == 200
    duplicate = await client.post(
        f"/entrepreneurships{prefix}/assignments",
        headers=coord_headers,
        json={"user_id": gestor.id, "role": "Gestor"},
    )
    assert duplicate.status_code == 409


async def test_validation_and_pm_requirements_remain_tbd(db, expediente_client):
    coord = await create_user(db, "coord", "Coordinadora")
    headers = {"Authorization": f"Bearer {token_for(coord)}"}
    client = expediente_client
    for payload in [{"name": "   "}, {"name": "Valid", "status": "approved"}]:
        assert (
            await client.post("/entrepreneurships", headers=headers, json=payload)
        ).status_code == 422
    enterprise = (
        await client.post("/entrepreneurships", headers=headers, json={"name": "Valid"})
    ).json()
    endpoint = f"/entrepreneurships/{enterprise['id']}/enrollments"
    assert (
        await client.post(
            endpoint,
            headers=headers,
            json={"program": "Prototipado", "enrolled_at": "2026-09-15T12:00:00"},
        )
    ).status_code == 422
    pm = await client.post(
        endpoint,
        headers=headers,
        json={"program": "Puesta en marcha", "enrolled_at": "2026-09-15T12:00:00Z"},
    )
    assert pm.status_code == 409
    assert "TBD" in pm.json()["detail"]
    assert (await client.get(endpoint, headers=headers)).json() == []
    assert (await client.get("/entrepreneurships?offset=-1", headers=headers)).status_code == 422
    assert (await client.get("/entrepreneurships/not-a-uuid", headers=headers)).status_code == 422


# US-PRO-001 / US-PM-001: el filtro de autorización precede a la paginación.
@pytest.mark.parametrize("role", ["Coordinadora", "Gestor", "Emprendedor"])
async def test_enrollment_and_cycle_pagination(db, expediente_client, role):
    from datetime import UTC, datetime

    from app.modules.expediente.service import (
        assign_to_cycle,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
    )

    coord = await create_user(db, "coord", "Coordinadora")
    actor = coord if role == "Coordinadora" else await create_user(db, "reader", role)
    enterprise = await create_entrepreneurship(db, coord, "Pagination")
    enrollments = []
    cycles = []
    for index in range(3):
        enrollment = await create_enrollment(
            db, coord, enterprise.id, "Prototipado", datetime(2026, 9, index + 1, tzinfo=UTC)
        )
        enrollments.append(enrollment)
        # A hidden sibling before the allowed ones detects pagination before filtering.
        await create_cycle(db, coord, enrollment, "Hidden")
        allowed = [await create_cycle(db, coord, enrollment, f"Allowed {n}") for n in range(2)]
        cycles.append(allowed)
        if role != "Coordinadora" and index > 0:
            for cycle in allowed:
                await assign_to_cycle(db, coord, cycle, actor.id, role)
    headers = {"Authorization": f"Bearer {token_for(actor)}"}
    client = expediente_client
    enrollment_path = f"/entrepreneurships/{enterprise.id}/enrollments"
    expected_enrollments = enrollments if role == "Coordinadora" else enrollments[1:]
    for offset, expected in enumerate(expected_enrollments):
        response = await client.get(f"{enrollment_path}?limit=1&offset={offset}", headers=headers)
        assert response.status_code == 200
        assert [row["id"] for row in response.json()] == [expected.id]
    assert (
        await client.get(f"{enrollment_path}?offset={len(expected_enrollments)}", headers=headers)
    ).json() == []
    cycle_path = f"/entrepreneurships/enrollments/{enrollments[1].id}/cycles"
    all_cycles = (await client.get(cycle_path, headers=headers)).json()
    assert len(all_cycles) == (3 if role == "Coordinadora" else 2)
    if role != "Coordinadora":
        assert [row["id"] for row in all_cycles] == [cycle.id for cycle in cycles[1]]
    for offset, expected in enumerate(all_cycles):
        response = await client.get(f"{cycle_path}?limit=1&offset={offset}", headers=headers)
        assert response.json() == [expected]
    for path in (enrollment_path, cycle_path):
        for query in ("limit=0", "limit=101", "offset=-1"):
            assert (await client.get(f"{path}?{query}", headers=headers)).status_code == 422


async def test_cycle_only_gestor_revokes_only_own_entrepreneurs(db, expediente_client):
    from datetime import UTC, datetime

    from sqlalchemy import select

    from app.models.audit import AuditLog
    from app.modules.expediente.service import (
        assign_to_cycle,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
    )

    coord = await create_user(db, "coord", "Coordinadora")
    gestor = await create_user(db, "gestor", "Gestor")
    member = await create_user(db, "member", "Emprendedor")
    enterprise = await create_entrepreneurship(db, coord, "Revocation scopes")
    enrollment = await create_enrollment(db, coord, enterprise.id, "Prototipado", datetime.now(UTC))
    own = await create_cycle(db, coord, enrollment, "Own")
    sibling = await create_cycle(db, coord, enrollment, "Sibling")
    await assign_to_cycle(db, coord, own, gestor.id, "Gestor")
    own_assignment = await assign_to_cycle(db, coord, own, member.id, "Emprendedor")
    sibling_assignment = await assign_to_cycle(db, coord, sibling, member.id, "Emprendedor")
    client = expediente_client
    headers = {"Authorization": f"Bearer {token_for(gestor)}"}
    prefix = "/entrepreneurships/cycles"
    # A valid assignment ID cannot be moved into an authorized URL scope.
    assert (
        await client.delete(
            f"{prefix}/{own.id}/assignments/{sibling_assignment.id}", headers=headers
        )
    ).status_code == 404
    assert (
        await client.delete(
            f"{prefix}/{sibling.id}/assignments/{sibling_assignment.id}", headers=headers
        )
    ).status_code == 403
    assert (
        await client.delete(f"{prefix}/{own.id}/assignments/{own_assignment.id}", headers=headers)
    ).status_code == 200
    await db.refresh(sibling_assignment)
    assert sibling_assignment.revoked_at is None
    audit = (await db.scalars(select(AuditLog).where(AuditLog.action.like("%.revoked")))).one()
    assert audit.actor_id == gestor.id
    assert audit.entity_id == own_assignment.id
    member_headers = {"Authorization": f"Bearer {token_for(member)}"}
    assert (await client.get(f"{prefix}/{own.id}", headers=member_headers)).status_code == 403
    assert (await client.get(f"{prefix}/{sibling.id}", headers=member_headers)).status_code == 200
    listed = await client.get(
        f"/entrepreneurships/enrollments/{enrollment.id}/cycles", headers=member_headers
    )
    assert [row["id"] for row in listed.json()] == [sibling.id]


@pytest.mark.parametrize("cycle_scope", [False, True])
async def test_unrelated_integrity_errors_are_not_reported_as_duplicates(
    db, monkeypatch, cycle_scope
):
    from datetime import UTC, datetime
    from sqlite3 import IntegrityError as SQLiteIntegrityError
    from unittest.mock import AsyncMock

    from sqlalchemy.exc import IntegrityError

    from app.modules.expediente.service import (
        assign_to_cycle,
        assign_to_entrepreneurship,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
    )

    coord = await create_user(db, "coord", "Coordinadora")
    member = await create_user(db, "member", "Emprendedor")
    enterprise = await create_entrepreneurship(db, coord, "Integrity")
    enrollment = await create_enrollment(db, coord, enterprise.id, "Prototipado", datetime.now(UTC))
    cycle = await create_cycle(db, coord, enrollment, "Integrity")
    error = IntegrityError("INSERT", {}, SQLiteIntegrityError("FOREIGN KEY constraint failed"))
    monkeypatch.setattr(db, "flush", AsyncMock(side_effect=error))
    rollback = AsyncMock(wraps=db.rollback)
    monkeypatch.setattr(db, "rollback", rollback)
    with pytest.raises(IntegrityError) as caught:
        if cycle_scope:
            await assign_to_cycle(db, coord, cycle, member.id, "Emprendedor")
        else:
            await assign_to_entrepreneurship(db, coord, enterprise.id, member.id, "Emprendedor")
    assert caught.value is error
    rollback.assert_awaited_once()


@pytest.mark.parametrize("cycle_scope", [False, True])
async def test_postgres_migration_active_uniqueness_and_history(cycle_scope):
    """Run against a disposable database with migrations 001/002, not metadata.create_all."""
    import os
    import runpy
    from datetime import UTC, datetime
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from fastapi import HTTPException
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.models.audit import AuditLog
    from app.modules.expediente.service import (
        assign_to_cycle,
        assign_to_entrepreneurship,
        create_cycle,
        create_enrollment,
        create_entrepreneurship,
        revoke_assignment,
    )

    url = os.environ.get("EXPEDIENTE_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requires disposable PostgreSQL EXPEDIENTE_TEST_DATABASE_URL")
    engine = create_async_engine(url)

    def migrate(connection):
        versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
        with Operations.context(MigrationContext.configure(connection)):
            for filename in ("001_initial_identity.py", "002_expediente.py"):
                runpy.run_path(str(versions / filename))["upgrade"]()

    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.run_sync(migrate)
                async with AsyncSession(
                    bind=connection,
                    expire_on_commit=False,
                    join_transaction_mode="create_savepoint",
                ) as session:
                    coord = await create_user(session, "coord", "Coordinadora")
                    member = await create_user(session, "member", "Emprendedor")
                    enterprise = await create_entrepreneurship(session, coord, "Postgres")
                    enrollment = await create_enrollment(
                        session, coord, enterprise.id, "Prototipado", datetime.now(UTC)
                    )
                    cycle = await create_cycle(session, coord, enrollment, "Postgres")

                    async def assign():
                        if cycle_scope:
                            return await assign_to_cycle(
                                session, coord, cycle, member.id, "Emprendedor"
                            )
                        return await assign_to_entrepreneurship(
                            session, coord, enterprise.id, member.id, "Emprendedor"
                        )

                    original = await assign()
                    original_id = original.id
                    with pytest.raises(HTTPException) as duplicate:
                        await assign()
                    assert duplicate.value.status_code == 409
                    # A rollback expires ORM entities; reload before exercising the next transaction.
                    for entity in (coord, member, enterprise, cycle, original):
                        await session.refresh(entity)
                    await revoke_assignment(session, coord, original)
                    replacement = await assign()
                    assert replacement.id != original_id
                    assert original.revoked_at is not None
                    assert len((await session.scalars(select(type(original)))).all()) == 2
                    audit = (
                        await session.scalars(
                            select(AuditLog).where(
                                AuditLog.entity_id == original_id, AuditLog.action.like("%.revoked")
                            )
                        )
                    ).one()
                    assert audit.actor_id == coord.id
                    assert audit.before["revoked_at"] is None
                    assert audit.after["revoked_at"] is not None
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()
