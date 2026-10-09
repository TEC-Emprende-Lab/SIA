"""Archivos privados: autorización, alcance y entrega firmada.

US-PRO-001/002 y US-PM-001/002. Límites MIME y tamaño siguen TBD.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.audit import AuditLog
from app.models.document import Document
from app.models.expediente import Entrepreneurship, EntrepreneurshipAssignment
from app.models.user import User
from app.modules.documents.routes import get_object_store
from app.security.clerk import create_test_token
from app.storage.store import MemoryObjectStore, UnconfiguredObjectStore

settings.clerk_secret_key = "test-secret-for-documents-at-least-32-bytes"
settings.clerk_issuer = "test-issuer"
settings.clerk_audience = "test-audience"


def token_for(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_test_token(user.clerk_user_id or 'x', user.email)}"}


async def create_user(db: AsyncSession, clerk_id: str, role: str) -> User:
    user = User(clerk_user_id=clerk_id, email=f"{clerk_id}@test.cr", role=role)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_assigned_user_uploads_and_receives_signed_url_without_storage_key(
    db: AsyncSession, monkeypatch
):
    async def allow_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.documents.routes.check_rate_limit", allow_rate_limit)
    founder = await create_user(db, "founder-doc", "Emprendedor")
    outsider = await create_user(db, "outsider-doc", "Emprendedor")
    project = Entrepreneurship(name="Privado")
    db.add(project)
    await db.flush()
    db.add(
        EntrepreneurshipAssignment(
            entrepreneurship_id=project.id, user_id=founder.id, role="Emprendedor"
        )
    )
    await db.commit()
    memory = MemoryObjectStore()

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_object_store] = lambda: memory
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            denied = await client.post(
                f"/entrepreneurships/{project.id}/documents",
                headers=token_for(outsider),
                files={"file": ("notas.pdf", b"hola", "application/pdf")},
            )
            assert denied.status_code == 403
            empty = await client.post(
                f"/entrepreneurships/{project.id}/documents",
                headers=token_for(founder),
                files={"file": ("vacio.pdf", b"", "application/pdf")},
            )
            assert empty.status_code == 422
            created = await client.post(
                f"/entrepreneurships/{project.id}/documents",
                headers=token_for(founder),
                files={"file": ("notas.pdf", b"hola", "application/pdf")},
            )
            assert created.status_code == 201
            payload = created.json()
            assert payload["name"] == "notas.pdf"
            assert payload["mime"] == "application/pdf"
            assert payload["size"] == 4
            assert "storage_key" not in payload
            document_id = payload["id"]
            stored = next(iter(memory.objects.values()))
            assert stored == (b"hola", "application/pdf")
            access = await client.get(
                f"/entrepreneurships/{project.id}/documents/{document_id}/access",
                headers=token_for(founder),
            )
            assert access.status_code == 200
            assert access.json()["expires_in"] == settings.storage_signed_url_seconds
            assert access.json()["url"].startswith("https://storage.test/documents/")
            assert "storage_key" not in access.json()
            hidden = await client.get(
                f"/entrepreneurships/{project.id}/documents/{document_id}/access",
                headers=token_for(outsider),
            )
            assert hidden.status_code == 403
    finally:
        app.dependency_overrides.clear()

    audits = (await db.scalars(select(AuditLog).where(AuditLog.entity_id == document_id))).all()
    assert {item.action for item in audits} == {"document.created", "document.access"}
    assert all("url" not in (item.after or {}) for item in audits)


@pytest.mark.asyncio
async def test_download_does_not_cross_entrepreneurships(db: AsyncSession, monkeypatch):
    async def allow_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.documents.routes.check_rate_limit", allow_rate_limit)
    founder = await create_user(db, "founder-scope", "Emprendedor")
    own = Entrepreneurship(name="Propio")
    other = Entrepreneurship(name="Ajeno")
    db.add_all([own, other])
    await db.flush()
    db.add(
        EntrepreneurshipAssignment(
            entrepreneurship_id=own.id, user_id=founder.id, role="Emprendedor"
        )
    )
    foreign = Document(
        entrepreneurship_id=other.id,
        storage_key="documents/other/secret",
        name="secreto.pdf",
        mime="application/pdf",
        size=3,
        uploaded_by=founder.id,
    )
    db.add(foreign)
    await db.commit()

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_object_store] = lambda: MemoryObjectStore()
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            same_project = await client.get(
                f"/entrepreneurships/{own.id}/documents/{foreign.id}/access",
                headers=token_for(founder),
            )
            assert same_project.status_code == 404
            other_project = await client.get(
                f"/entrepreneurships/{other.id}/documents/{foreign.id}/access",
                headers=token_for(founder),
            )
            assert other_project.status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_unconfigured_storage_does_not_create_a_row(db: AsyncSession, monkeypatch):
    async def allow_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr("app.modules.documents.routes.check_rate_limit", allow_rate_limit)
    coordinator = await create_user(db, "coord-doc", "Coordinadora")
    project = Entrepreneurship(name="Sin bucket")
    db.add(project)
    await db.commit()

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_object_store] = lambda: UnconfiguredObjectStore()
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/entrepreneurships/{project.id}/documents",
                headers=token_for(coordinator),
                files={"file": ("notas.pdf", b"hola", "application/pdf")},
            )
            assert response.status_code == 503
    finally:
        app.dependency_overrides.clear()
    assert (await db.scalars(select(Document))).all() == []
