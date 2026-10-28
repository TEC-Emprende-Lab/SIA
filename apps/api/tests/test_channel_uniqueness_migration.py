"""US-COM-001: migration 012 preserves history and refuses ambiguous existing data."""

import os
import runpy
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine


@pytest.fixture(params=["sqlite", "postgresql"])
async def channel_schema(request):
    url = "sqlite+aiosqlite:///:memory:"
    admin = None
    schema = None
    options = {}
    if request.param == "postgresql":
        url = os.getenv("COMUNICACION_TEST_DATABASE_URL", "")
        if not url.startswith("postgresql"):
            pytest.skip("Requires disposable PostgreSQL")
        schema = f"channel_migration_{uuid4().hex}"
        admin = create_async_engine(url)
        async with admin.begin() as connection:
            await connection.execute(sa.text(f'CREATE SCHEMA "{schema}"'))
        options = {"connect_args": {"server_settings": {"search_path": schema}}}
    engine = create_async_engine(url, **options)
    metadata = sa.MetaData()
    channels = sa.Table(
        "channels",
        metadata,
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("entrepreneurship_id", sa.String, nullable=False),
        sa.Column("kind", sa.String),
        sa.Column("cycle_id", sa.String),
    )
    try:
        async with engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        yield engine, channels
    finally:
        await engine.dispose()
        if admin is not None:
            async with admin.begin() as connection:
                await connection.execute(sa.text(f'DROP SCHEMA "{schema}" CASCADE'))
            await admin.dispose()


def apply_migration(connection, direction="upgrade"):
    path = (
        Path(__file__).resolve().parents[1]
        / "alembic/versions/012_restore_shared_channel_uniqueness.py"
    )
    with Operations.context(MigrationContext.configure(connection)):
        runpy.run_path(str(path))[direction]()


async def test_restore_partial_uniqueness_without_rewriting_history(channel_schema):
    engine, channels = channel_schema
    history = [
        {"id": "legacy-1", "entrepreneurship_id": "e1", "kind": None, "cycle_id": None},
        {"id": "legacy-2", "entrepreneurship_id": "e1", "kind": None, "cycle_id": None},
        {"id": "cycle-1", "entrepreneurship_id": "e1", "kind": "finanzas", "cycle_id": "c1"},
        {"id": "cycle-2", "entrepreneurship_id": "e1", "kind": "finanzas", "cycle_id": "c2"},
        {"id": "shared", "entrepreneurship_id": "e1", "kind": "finanzas", "cycle_id": None},
    ]
    async with engine.begin() as connection:
        await connection.execute(channels.insert(), history)
        await connection.run_sync(apply_migration)
        assert [
            dict(row)
            for row in (
                await connection.execute(sa.select(channels).order_by(channels.c.id))
            ).mappings()
        ] == sorted(history, key=lambda row: row["id"])
        with pytest.raises(IntegrityError):
            async with connection.begin_nested():
                await connection.execute(
                    channels.insert().values(
                        id="duplicate", entrepreneurship_id="e1", kind="finanzas"
                    )
                )
        await connection.execute(
            channels.insert().values(id="other", entrepreneurship_id="e2", kind="finanzas")
        )
        await connection.run_sync(lambda conn: apply_migration(conn, "downgrade"))
        await connection.execute(
            channels.insert().values(
                id="after-downgrade", entrepreneurship_id="e1", kind="finanzas"
            )
        )


async def test_duplicates_stop_migration_without_deleting_records(channel_schema):
    engine, channels = channel_schema
    history = [
        {"id": "first", "entrepreneurship_id": "e1", "kind": "finanzas", "cycle_id": None},
        {"id": "second", "entrepreneurship_id": "e1", "kind": "finanzas", "cycle_id": None},
    ]
    async with engine.begin() as connection:
        await connection.execute(channels.insert(), history)
    with pytest.raises(RuntimeError, match="duplicate shared channel kinds"):
        async with engine.begin() as connection:
            await connection.run_sync(apply_migration)
    async with engine.connect() as connection:
        assert [
            dict(row)
            for row in (
                await connection.execute(sa.select(channels).order_by(channels.c.id))
            ).mappings()
        ] == sorted(history, key=lambda row: row["id"])
