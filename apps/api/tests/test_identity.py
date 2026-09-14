import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.invitation import Invitation
from app.models.user import User
from app.security.clerk import create_test_token

settings.clerk_secret_key = "test-secret-for-phase1"
settings.clerk_issuer = "test-issuer"
settings.clerk_audience = "test-audience"


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
