from contextlib import asynccontextmanager
from importlib import import_module

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
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
