from contextlib import asynccontextmanager
from importlib import import_module

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.main import app


def test_healthcheck_reports_api_service() -> None:
    response = TestClient(app).get("/healthz")

    assert response.status_code == 200
    assert response.json()["service"] == "api"


async def test_readiness_rejects_unmigrated_database(monkeypatch):
    main = import_module("app.main")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(main, "engine", engine)
    try:
        async with app.router.lifespan_context(app):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                assert (await client.get("/healthz")).status_code == 200
                response = await client.get("/readyz")
                assert response.status_code == 503
                assert response.json() == {"status": "degraded", "service": "api"}
            # Lifespan must not manufacture tables or stamp a migration.
            async with engine.connect() as connection:
                from sqlalchemy import text

                assert (
                    await connection.execute(
                        text("SELECT name FROM sqlite_master WHERE type='table'")
                    )
                ).all() == []
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    ("revisions", "expected_status"),
    [
        (["012"], 200),
        (["013"], 200),
        (["011"], 503),
        (["014"], 503),
        ([], 503),
        (["012", "013"], 503),
    ],
)
async def test_readiness_requires_one_explicitly_compatible_revision(
    monkeypatch, revisions, expected_status
):
    main = import_module("app.main")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(main, "engine", engine)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
            for revision in revisions:
                await conn.execute(
                    text("INSERT INTO alembic_version VALUES (:revision)"),
                    {"revision": revision},
                )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/readyz")
        assert response.status_code == expected_status
    finally:
        await engine.dispose()


async def test_readiness_fails_closed_if_code_head_changes(monkeypatch):
    main = import_module("app.main")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "BRIDGE_CODE_HEADS", frozenset({"013"}))
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
            await conn.execute(text("INSERT INTO alembic_version VALUES ('012')"))
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            assert (await client.get("/readyz")).status_code == 503
    finally:
        await engine.dispose()


@pytest.mark.parametrize("error", [ConnectionError, TimeoutError])
async def test_readiness_database_failure_is_503(monkeypatch, error):
    main = import_module("app.main")

    class UnavailableEngine:
        @asynccontextmanager
        async def connect(self):
            raise error("private database details")
            yield

    monkeypatch.setattr(main, "engine", UnavailableEngine())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/readyz")
        assert response.status_code == 503
        assert "private" not in response.text
        assert (await client.get("/healthz")).status_code == 200
