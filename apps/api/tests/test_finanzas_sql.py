"""US-PRO-003: manual SQL refuses wrong revisions and matches canonical metadata."""

import os
import runpy
from pathlib import Path

import asyncpg
import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy.ext.asyncio import create_async_engine

from app.models import Base

URL = os.getenv("FINANZAS_TEST_DATABASE_URL", "")
pytestmark = pytest.mark.skipif(
    not URL.startswith("postgresql"), reason="Requires disposable PostgreSQL"
)


def migrations(connection, direction, include_finances):
    files = sorted((Path(__file__).resolve().parents[1] / "alembic/versions").glob("[0-9]*.py"))
    if not include_finances:
        files = [file for file in files if not file.name.startswith("013_")]
    with Operations.context(MigrationContext.configure(connection)):
        for file in files if direction == "upgrade" else reversed(files):
            runpy.run_path(str(file))[direction]()


async def test_manual_sql_guards_revision_preserves_data_and_matches_models():
    engine = create_async_engine(URL)
    applied = False
    async with engine.begin() as connection:
        await connection.run_sync(migrations, "upgrade", False)
    try:
        async with engine.connect() as connection:
            raw = await connection.get_raw_connection()
            driver = raw.driver_connection
            await driver.execute(
                "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) PRIMARY KEY)"
            )
            await driver.execute(
                "INSERT INTO alembic_version (version_num) VALUES ('011_drop_uq_channels_shared_kind')"
            )
            await driver.execute(
                "INSERT INTO entrepreneurships (id,name,created_at,updated_at) VALUES ('legacy','Conservar expediente',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"
            )
            sql = (
                Path(__file__).resolve().parents[3] / "deploy/migrations/013_finanzas.sql"
            ).read_text()
            with pytest.raises(asyncpg.PostgresError, match="Finanzas requiere Alembic 012"):
                await driver.execute(sql)
            await driver.execute("ROLLBACK")
            assert await driver.fetchval("SELECT to_regclass('finance_purchases')") is None
            await driver.execute("UPDATE alembic_version SET version_num='012'")
            await driver.execute(sql)
            applied = True
            assert await driver.fetchval("SELECT version_num FROM alembic_version") == "013"
            assert (
                await driver.fetchval("SELECT name FROM entrepreneurships WHERE id='legacy'")
                == "Conservar expediente"
            )
            differences = await connection.run_sync(
                lambda conn: compare_metadata(MigrationContext.configure(conn), Base.metadata)
            )
            assert differences == []
            await connection.rollback()
            with pytest.raises(asyncpg.PostgresError, match="Finanzas requiere Alembic 012"):
                await driver.execute(sql)
            await driver.execute("ROLLBACK")
    finally:
        async with engine.begin() as connection:
            await connection.run_sync(migrations, "downgrade", applied)
            from sqlalchemy import text

            await connection.execute(text("DELETE FROM alembic_version"))
        await engine.dispose()
