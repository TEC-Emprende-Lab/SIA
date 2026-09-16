import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.invitation import Invitation
from app.models.user import User
from app.security.clerk import create_test_token

settings.clerk_secret_key = "test-secret-for-identity-at-least-32-bytes"
settings.clerk_issuer = "test-issuer"
settings.clerk_audience = "test-audience"


@pytest.mark.parametrize(
    "claim,value",
    [(None, None), ("aud", None), ("iss", None), ("aud", "wrong"), ("iss", "wrong")],
)
async def test_production_rs256_validates_issuer_and_audience(
    identity_client, user_coordinadora, monkeypatch, claim, value
):
    from types import SimpleNamespace

    import jwt
    from cryptography.hazmat.primitives.asymmetric import rsa

    claims = jwt.decode(token_for(user_coordinadora), options={"verify_signature": False})
    if claim:
        if value is None:
            claims.pop(claim)
        else:
            claims[claim] = value
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    class LocalJwks:
        def get_signing_key_from_jwt(self, token):
            return SimpleNamespace(key=private_key.public_key())

    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "clerk_secret_key", "")
    monkeypatch.setattr("app.security.clerk._get_jwks_client", lambda: LocalJwks())
    token = jwt.encode(claims, private_key, algorithm="RS256")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == (200 if claim is None else 401)


async def test_administrative_bootstrap_cli_uses_real_session(tmp_path):
    import os
    import subprocess
    import sys
    from pathlib import Path

    from sqlalchemy.ext.asyncio import create_async_engine

    from app.models.audit import AuditLog

    url = f"sqlite+aiosqlite:///{tmp_path / 'bootstrap.db'}"
    env = {**os.environ, "SIA_DATABASE_URL": url, "SIA_ENVIRONMENT": "test"}
    cwd = Path(__file__).resolve().parents[1]
    migrated = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert migrated.returncode == 0, migrated.stderr
    command = [
        sys.executable,
        "-m",
        "app.modules.identity.service",
        "--email",
        "cli@example.org",
        "--operator",
        "cli-test",
    ]
    first = subprocess.run(command, env=env, cwd=cwd, capture_output=True, text=True, timeout=30)
    assert first.returncode == 0, first.stderr
    repeated = subprocess.run(command, env=env, cwd=cwd, capture_output=True, text=True, timeout=30)
    assert repeated.returncode == 2
    engine = create_async_engine(url)
    try:
        async with AsyncSession(engine) as db:
            invitation = (await db.scalars(select(Invitation))).one()
            assert invitation.role == "Coordinadora"
            assert invitation.used_at is None
            assert invitation.token not in first.stdout
            assert await db.scalar(select(User.id)) is None
            audit = (await db.scalars(select(AuditLog))).one()
            assert audit.action == "invitation.bootstrap"
            assert audit.after["operator"] == "cli-test"
    finally:
        await engine.dispose()


@pytest.mark.parametrize("environment", ["staging", "production", "unknown"])
async def test_hs256_rejected_outside_development_and_test(
    identity_client, monkeypatch, environment
):
    monkeypatch.setattr(settings, "environment", environment)
    token = create_test_token("first", "first@test.cr")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.mark.parametrize("field", ["clerk_issuer", "clerk_audience"])
async def test_missing_jwt_configuration_fails_closed(identity_client, monkeypatch, field):
    token = create_test_token("first", "first@test.cr")
    monkeypatch.setattr(settings, field, "")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


@pytest.fixture
async def user_coordinadora(db: AsyncSession) -> User:
    user = User(clerk_user_id="clerk_coord", email="coord@test.cr", role="Coordinadora")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
async def user_gestor(db: AsyncSession) -> User:
    user = User(clerk_user_id="clerk_gestor", email="gestor@test.cr", role="Gestor")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def token_for(user: User) -> str:
    return create_test_token(user.clerk_user_id or "x", user.email)


@pytest.mark.asyncio
async def test_health_still_public():
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/healthz")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_me_requires_auth(db: AsyncSession):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/users/me")
        assert resp.status_code == 401
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_coordinadora_can_invite_gestor(db: AsyncSession, user_coordinadora: User):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/invitations",
            json={"email": "nuevo@test.cr", "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(user_coordinadora)}"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201
    assert resp.json()["role"] == "Gestor"


@pytest.mark.asyncio
async def test_gestor_cannot_invite_coordinadora(db: AsyncSession, user_gestor: User):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/invitations",
            json={"email": "coord2@test.cr", "role": "Coordinadora"},
            headers={"Authorization": f"Bearer {token_for(user_gestor)}"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_emprendedor_created_via_invitation(db: AsyncSession, user_coordinadora: User):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/invitations",
            json={"email": "nuevo-emp@test.cr", "role": "Emprendedor"},
            headers={"Authorization": f"Bearer {token_for(user_coordinadora)}"},
        )
        new_token = create_test_token("clerk_new", "nuevo-emp@test.cr")
        resp = await client.get("/users/me", headers={"Authorization": f"Bearer {new_token}"})
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["email"] == "nuevo-emp@test.cr"
    assert resp.json()["role"] == "Emprendedor"
    result = await db.execute(select(Invitation).where(Invitation.email == "nuevo-emp@test.cr"))
    inv = result.scalar_one()
    assert inv.used_at is not None


@pytest.mark.asyncio
async def test_gestor_can_invite_emprendedor(db: AsyncSession, user_gestor: User):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/invitations",
            json={"email": "emp2@test.cr", "role": "Emprendedor"},
            headers={"Authorization": f"Bearer {token_for(user_gestor)}"},
        )
    app.dependency_overrides.clear()
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_rate_limit_returns_429(db: AsyncSession, user_coordinadora: User, monkeypatch):
    from httpx import ASGITransport, AsyncClient

    settings.rate_limit_requests = 1
    settings.rate_limit_window_seconds = 60

    class FakeRedis:
        def __init__(self):
            self.count = 0

        async def incr(self, key):
            self.count += 1
            return self.count

        async def expire(self, key, ttl):
            return True

    fake = FakeRedis()
    monkeypatch.setattr("app.core.rate_limit.get_redis", lambda: fake)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.post(
            "/invitations",
            json={"email": "rl1@test.cr", "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(user_coordinadora)}"},
        )
        r2 = await client.post(
            "/invitations",
            json={"email": "rl2@test.cr", "role": "Gestor"},
            headers={"Authorization": f"Bearer {token_for(user_coordinadora)}"},
        )
    app.dependency_overrides.clear()
    settings.rate_limit_requests = 60
    assert r1.status_code == 201
    assert r2.status_code == 429


# Núcleo común: acceso por invitación vigente y mismo correo verificado.
@pytest.fixture
async def identity_client(db):
    from httpx import ASGITransport, AsyncClient

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.clear()


async def test_empty_database_requires_invitation(identity_client, db):
    response = await identity_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {create_test_token('first', 'first@test.cr')}"},
    )
    assert response.status_code == 403
    assert await db.scalar(select(User.id)) is None


async def test_verified_status_claim_consumes_invitation(identity_client, db):
    import jwt

    from app.modules.identity.service import bootstrap_invitation

    await bootstrap_invitation(db, "first@test.cr", "test-admin")
    token = create_test_token("first", "first@test.cr")
    claims = jwt.decode(token, options={"verify_signature": False})
    claims["email_verified"] = "verified"
    token = jwt.encode(claims, settings.clerk_secret_key, algorithm="HS256")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "first@test.cr"


async def test_string_true_email_verified_claim(identity_client, db):
    import jwt

    from app.modules.identity.service import bootstrap_invitation

    await bootstrap_invitation(db, "first@test.cr", "test-admin")
    token = create_test_token("first", "first@test.cr")
    claims = jwt.decode(token, options={"verify_signature": False})
    claims["email_verified"] = "true"
    token = jwt.encode(claims, settings.clerk_secret_key, algorithm="HS256")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


@pytest.mark.parametrize("verified", [False, None, 1])
async def test_unverified_claim_cannot_consume_invitation(identity_client, db, verified):
    import jwt

    from app.modules.identity.service import bootstrap_invitation

    invitation = await bootstrap_invitation(db, "first@test.cr", "test-admin")
    token = create_test_token("first", "first@test.cr")
    claims = jwt.decode(token, options={"verify_signature": False})
    claims["email_verified"] = verified
    token = jwt.encode(claims, settings.clerk_secret_key, algorithm="HS256")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    await db.refresh(invitation)
    assert invitation.used_at is None
    assert await db.scalar(select(User.id)) is None


async def test_bootstrap_and_acceptance_are_audited(identity_client, db):
    from app.models.audit import AuditLog
    from app.modules.identity.service import bootstrap_invitation

    invitation = await bootstrap_invitation(db, "first@test.cr", "admin-cli")
    assert invitation.created_by is None
    response = await identity_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {create_test_token('first', 'first@test.cr')}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "Coordinadora"
    audits = list(
        (await db.scalars(select(AuditLog).where(AuditLog.entity_id == invitation.id))).all()
    )
    assert {a.action for a in audits} == {"invitation.bootstrap", "invitation.accepted"}
    assert (
        next(a for a in audits if a.action == "invitation.bootstrap").after["operator"]
        == "admin-cli"
    )
    assert (
        next(a for a in audits if a.action == "invitation.accepted").actor_id
        == response.json()["id"]
    )
    with pytest.raises(ValueError):
        await bootstrap_invitation(db, "second@test.cr", "admin-cli")


async def test_expired_invitation_and_email_rebinding_denied(
    identity_client, db, user_coordinadora
):
    from datetime import UTC, datetime, timedelta

    invitation = Invitation(
        email="expired@test.cr",
        role="Gestor",
        token="expired-token",
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    db.add(invitation)
    await db.commit()
    for subject, email in [("expired", invitation.email), ("attacker", user_coordinadora.email)]:
        response = await identity_client.get(
            "/users/me", headers={"Authorization": f"Bearer {create_test_token(subject, email)}"}
        )
        assert response.status_code == 403
    await db.refresh(user_coordinadora)
    await db.refresh(invitation)
    assert user_coordinadora.clerk_user_id == "clerk_coord"
    assert invitation.used_at is None


async def test_duplicate_invites_and_gestor_listing_scope(
    identity_client, db, user_coordinadora, user_gestor
):
    coord_headers = {"Authorization": f"Bearer {token_for(user_coordinadora)}"}
    gestor_headers = {"Authorization": f"Bearer {token_for(user_gestor)}"}
    first = await identity_client.post(
        "/invitations", headers=coord_headers, json={"email": "duplicate@test.cr", "role": "Gestor"}
    )
    assert first.status_code == 201
    duplicate = await identity_client.post(
        "/invitations",
        headers=coord_headers,
        json={"email": "DUPLICATE@test.cr", "role": "Emprendedor"},
    )
    assert duplicate.status_code == 409
    own = await identity_client.post(
        "/invitations", headers=gestor_headers, json={"email": "own@test.cr", "role": "Emprendedor"}
    )
    assert own.status_code == 201
    listed = await identity_client.get("/invitations", headers=gestor_headers)
    assert [row["id"] for row in listed.json()] == [own.json()["id"]]
    assert len((await identity_client.get("/invitations", headers=coord_headers)).json()) == 2
    assert (
        await identity_client.get("/invitations?limit=101", headers=coord_headers)
    ).status_code == 422
    assert (await identity_client.get("/invitations?offset=1", headers=gestor_headers)).json() == []


@pytest.mark.parametrize(
    "claim,value", [("exp", None), ("aud", "wrong"), ("iss", "wrong"), ("sub", 123)]
)
async def test_jwt_required_claims(identity_client, claim, value):
    import jwt

    claims = jwt.decode(
        create_test_token("first", "first@test.cr"), options={"verify_signature": False}
    )
    if value is None:
        claims.pop(claim)
    else:
        claims[claim] = value
    token = jwt.encode(claims, settings.clerk_secret_key, algorithm="HS256")
    response = await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


async def test_expired_history_does_not_block_new_invitation(
    identity_client, db, user_coordinadora
):
    from datetime import UTC, datetime, timedelta

    old = Invitation(
        email="renew@test.cr",
        role="Gestor",
        token="old",
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(old)
    await db.commit()
    response = await identity_client.post(
        "/invitations",
        headers={"Authorization": f"Bearer {token_for(user_coordinadora)}"},
        json={"email": "renew@test.cr", "role": "Emprendedor"},
    )
    assert response.status_code == 201
    accepted = await identity_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {create_test_token('renew', 'renew@test.cr')}"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["role"] == "Emprendedor"
    await db.refresh(old)
    assert old.used_at is None


async def test_ambiguous_legacy_invitations_fail_closed(identity_client, db):
    from datetime import UTC, datetime, timedelta

    for role in ("Gestor", "Coordinadora"):
        db.add(
            Invitation(
                email="ambiguous@test.cr",
                role=role,
                token=role,
                expires_at=datetime.now(UTC) + timedelta(days=1),
            )
        )
    await db.commit()
    response = await identity_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {create_test_token('ambiguous', 'ambiguous@test.cr')}"},
    )
    assert response.status_code == 403
    assert await db.scalar(select(User.id)) is None


@pytest.fixture
async def postgres_sessions():
    """Real independent transactions; isolated disposable schema, never application data."""
    import os
    from uuid import uuid4

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.db.base import Base

    url = os.environ.get("SIA_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("SIA_TEST_POSTGRES_URL required for PostgreSQL concurrency tests")
    schema = f"identity_test_{uuid4().hex}"
    admin = create_async_engine(url)
    async with admin.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": schema}})
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()


async def test_concurrent_invitation_creation_has_single_winner(postgres_sessions):
    import asyncio

    from fastapi import HTTPException

    from app.models.audit import AuditLog
    from app.modules.identity.service import create_invitation

    async with postgres_sessions() as db:
        actor = User(email="coord@test.cr", clerk_user_id="coord", role="Coordinadora")
        db.add(actor)
        await db.commit()
        actor_id = actor.id

    async def issue():
        async with postgres_sessions() as db:
            actor = await db.get(User, actor_id)
            try:
                invitation = await create_invitation(db, actor, "race@test.cr", "Emprendedor")
                return invitation.id
            except HTTPException as exc:
                assert exc.status_code == 409
                return None

    results = await asyncio.wait_for(asyncio.gather(issue(), issue()), timeout=10)
    assert sum(result is not None for result in results) == 1
    async with postgres_sessions() as db:
        assert len(list(await db.scalars(select(Invitation)))) == 1
        assert len(list(await db.scalars(select(AuditLog)))) == 1


async def test_concurrent_acceptance_cannot_rebind_identity(postgres_sessions):
    import asyncio

    from fastapi import HTTPException

    from app.models.audit import AuditLog
    from app.modules.identity.service import bootstrap_invitation
    from app.security.deps import get_current_user

    async with postgres_sessions() as db:
        invitation = await bootstrap_invitation(db, "race@test.cr", "concurrency-test")
        invitation_id = invitation.id

    async def accept(subject):
        async with postgres_sessions() as db:
            try:
                user = await get_current_user(
                    f"Bearer {create_test_token(subject, 'race@test.cr')}", db
                )
                return user.clerk_user_id
            except HTTPException as exc:
                assert exc.status_code == 403
                return None

    results = await asyncio.wait_for(asyncio.gather(accept("one"), accept("two")), timeout=10)
    assert sum(result is not None for result in results) == 1
    async with postgres_sessions() as db:
        users = list(await db.scalars(select(User)))
        assert len(users) == 1
        assert users[0].clerk_user_id in results
        audits = list(
            await db.scalars(select(AuditLog).where(AuditLog.action == "invitation.accepted"))
        )
        assert len(audits) == 1
        assert audits[0].entity_id == invitation_id


async def test_concurrent_bootstrap_has_single_winner(postgres_sessions):
    import asyncio

    from app.modules.identity.service import bootstrap_invitation

    async def bootstrap(email):
        async with postgres_sessions() as db:
            try:
                return (await bootstrap_invitation(db, email, "concurrent-admin")).id
            except ValueError:
                return None

    results = await asyncio.wait_for(
        asyncio.gather(bootstrap("first@test.cr"), bootstrap("second@test.cr")), timeout=10
    )
    assert sum(result is not None for result in results) == 1


async def test_expired_jwt_and_used_invitation_are_denied(identity_client, db):
    from datetime import UTC, datetime, timedelta

    used = Invitation(
        email="used@test.cr",
        role="Coordinadora",
        token="used",
        used_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )
    db.add(used)
    await db.commit()
    token = create_test_token("used", "used@test.cr")
    assert (
        await identity_client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    ).status_code == 403
    expired = create_test_token("used", "used@test.cr", exp_seconds=-1)
    assert (
        await identity_client.get("/users/me", headers={"Authorization": f"Bearer {expired}"})
    ).status_code == 401
    assert await db.scalar(select(User.id)) is None


async def test_emprendedor_cannot_administer_identity(identity_client, db):
    user = User(email="emp@test.cr", clerk_user_id="emp", role="Emprendedor")
    db.add(user)
    await db.commit()
    headers = {"Authorization": f"Bearer {token_for(user)}"}
    for endpoint in ("/users", "/invitations"):
        assert (await identity_client.get(endpoint, headers=headers)).status_code == 403
    assert (
        await identity_client.post(
            "/invitations",
            headers=headers,
            json={"email": "another@test.cr", "role": "Emprendedor"},
        )
    ).status_code == 403
