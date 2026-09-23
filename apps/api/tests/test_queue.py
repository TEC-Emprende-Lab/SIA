"""Cola de trabajos: idempotencia al encolar, reclamo atómico y reintentos.

Ejecuta las migraciones reales (upgrade/downgrade) sobre SQLite en memoria.
``QUEUE_TEST_DATABASE_URL`` corre la misma batería en PostgreSQL desechable e
incluye la prueba de ``FOR UPDATE SKIP LOCKED``. La base debe ser vacía y
desechable: la migración crea y elimina sus tablas.
"""

import os
import runpy
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.queue import Job
from app.queue import service


def migrate(connection, direction):
    files = sorted((Path(__file__).resolve().parents[1] / "alembic/versions").glob("00*.py"))
    if direction == "downgrade":
        files.reverse()
    with Operations.context(MigrationContext.configure(connection)):
        for file in files:
            runpy.run_path(str(file))[direction]()


@pytest.fixture
async def sessions():
    url = os.getenv("QUEUE_TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = create_async_engine(url)
    if url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def foreign_keys(connection, _record):
            connection.execute("PRAGMA foreign_keys=ON")

    async with engine.begin() as conn:
        await conn.run_sync(migrate, "upgrade")
    maker = async_sessionmaker(engine, expire_on_commit=False)
    yield maker
    async with engine.begin() as conn:
        await conn.run_sync(migrate, "downgrade")
    await engine.dispose()


async def test_enqueue_is_idempotent(sessions):
    async with sessions() as db:
        first = await service.enqueue(db, "email", {"to": "a@x"}, idempotency_key="k1")
        again = await service.enqueue(db, "email", {"to": "a@x"}, idempotency_key="k1")
        other = await service.enqueue(db, "email", {"to": "b@x"}, idempotency_key="k2")
        await db.commit()
        assert first.id == again.id
        assert other.id != first.id
        assert await db.scalar(select(func.count()).select_from(Job)) == 2


async def test_claim_marks_and_completes(sessions):
    async with sessions() as db:
        job = await service.enqueue(db, "pdf", {"report": 1})
        await db.commit()
        job_id = job.id
    async with sessions() as db:
        claimed = await service.claim(db, "worker-1")
        await db.commit()
        assert claimed is not None
        assert claimed.id == job_id
        assert claimed.status == "claimed"
        assert claimed.attempts == 1
        assert claimed.locked_by == "worker-1"
    async with sessions() as db:
        assert await service.claim(db, "worker-2") is None  # ya no hay pendientes
        await db.commit()
    async with sessions() as db:
        done = await service.complete(db, job_id)
        await db.commit()
        assert done.status == "done"
        assert done.locked_by is None
        assert done.locked_at is None


async def test_claim_respects_run_at(sessions):
    future = datetime.now(UTC) + timedelta(hours=1)
    async with sessions() as db:
        await service.enqueue(db, "reminder", run_at=future)
        await db.commit()
    async with sessions() as db:
        assert await service.claim(db, "w") is None  # aún no vence
        await db.commit()
    async with sessions() as db:
        claimed = await service.claim(db, "w", now=future + timedelta(seconds=1))
        await db.commit()
        assert claimed is not None


async def test_claim_filters_by_kind(sessions):
    async with sessions() as db:
        await service.enqueue(db, "email")
        await service.enqueue(db, "pdf")
        await db.commit()
    async with sessions() as db:
        claimed = await service.claim(db, "w", kinds=["pdf"])
        await db.commit()
        assert claimed is not None
        assert claimed.kind == "pdf"


async def test_fail_retries_then_gives_up(sessions):
    async with sessions() as db:
        job = await service.enqueue(db, "email")
        job.max_attempts = 2
        await db.commit()
        job_id = job.id
    # Intento 1: falla y vuelve a la cola.
    async with sessions() as db:
        await service.claim(db, "w")
        retried = await service.fail(db, job_id, "boom", retry_in=timedelta(0))
        await db.commit()
        assert retried.status == "pending"
        assert retried.attempts == 1
        assert retried.last_error == "boom"
    # Intento 2: alcanza max_attempts y se rinde.
    async with sessions() as db:
        claimed = await service.claim(db, "w")
        assert claimed is not None
        assert claimed.attempts == 2
        dead = await service.fail(db, job_id, "otra vez")
        await db.commit()
        assert dead.status == "failed"


async def test_skip_locked_hands_distinct_jobs(sessions):
    if not os.getenv("QUEUE_TEST_DATABASE_URL", "").startswith("postgresql"):
        pytest.skip("SKIP LOCKED requiere PostgreSQL")
    async with sessions() as db:
        await service.enqueue(db, "email", idempotency_key="a")
        await service.enqueue(db, "email", idempotency_key="b")
        await db.commit()
    # Dos workers concurrentes: el primero bloquea su fila, el segundo la salta.
    async with sessions() as s1, sessions() as s2:
        j1 = await service.claim(s1, "w1")
        j2 = await service.claim(s2, "w2")
        assert j1 is not None
        assert j2 is not None
        assert j1.id != j2.id
        await s1.commit()
        await s2.commit()
