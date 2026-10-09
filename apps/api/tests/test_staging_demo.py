"""US-PRO-001/004/005/006 demo data; no production writes or fake approvals."""

import pytest
from sqlalchemy import func, select, text

from app.domain.staging_demo import (
    DATABASE,
    HOST,
    ORIGIN,
    PROJECTS,
    activity_dates,
    ensure_target,
    populate,
    repair_demo_dates,
    stable_id,
)
from app.models.audit import AuditLog
from app.models.comunicacion import Agreement, Channel, Message, Minutes
from app.models.expediente import Entrepreneurship, EntrepreneurshipAssignment
from app.models.informes import TechnicalReport
from app.models.seguimiento import (
    Activity,
    Ambition,
    CanvasArea,
    Diagnostic,
    Evidence,
    Objective,
    ProgramCanvas,
    Validation,
)
from app.models.user import User
from app.modules.seguimiento.definitions import AREAS, definition_id
from app.modules.seguimiento.service import summary


def test_exact_staging_guard():
    url = f"postgresql+asyncpg://demo:unused@{HOST}:5432/{DATABASE}"
    ensure_target("staging", url, ORIGIN)
    for environment, destination, origin in [
        ("production", url, ORIGIN),
        ("development", url, ORIGIN),
        ("staging", url.replace(HOST, "production-db"), ORIGIN),
        ("staging", url.replace(DATABASE, "sia_production"), ORIGIN),
        ("staging", url, "https://sia.neuroboard.app"),
        ("staging", "sqlite+aiosqlite:///:memory:", ORIGIN),
    ]:
        with pytest.raises(ValueError, match="bloqueado"):
            ensure_target(environment, destination, origin)


def test_experiment_dates_match_the_work_plan():
    for key, duration in [("bruma", 42), ("circular", 28)]:
        start, end = activity_dates(key, 4, 2)
        assert (end - start).days == duration
        analysis_start, _ = activity_dates(key, 4, 3)
        assert analysis_start > end


async def prepare(db):
    if db.bind.dialect.name == "sqlite":
        await db.execute(text("PRAGMA foreign_keys=ON"))
    actor = User(id="demo-operator", email="operator@example.test", role="Coordinadora")
    founder = User(id="demo-founder", email="founder@example.test", role="Emprendedor")
    manager = User(id="demo-manager", email="manager@example.test", role="Gestor")
    db.add_all([actor, founder, manager])
    canvas_id = definition_id("Prototipado")
    if await db.get(ProgramCanvas, canvas_id) is None:
        db.add(ProgramCanvas(id=canvas_id, program="Prototipado", version=1))
        await db.flush()
        for index, (key, name, description) in enumerate(AREAS["Prototipado"]):
            db.add(
                CanvasArea(
                    id=definition_id("Prototipado", key),
                    canvas_id=canvas_id,
                    key=key,
                    name=name,
                    description=description,
                    position=index,
                )
            )
    await db.commit()
    return actor, [founder, manager]


async def test_complete_consistent_idempotent_demo(db):
    actor, readers = await prepare(db)
    result = await populate(db, actor, readers)
    await db.commit()
    counts = {
        Entrepreneurship: 4,
        EntrepreneurshipAssignment: 8,
        Ambition: 16,
        Objective: 24,
        Activity: 96,
        Evidence: 36,
        Diagnostic: 12,
        Minutes: 12,
        Agreement: 24,
        Channel: 12,
        Message: 72,
        TechnicalReport: 8,
        Validation: 0,
        AuditLog: 1,
    }
    for model, count in counts.items():
        assert await db.scalar(select(func.count()).select_from(model)) == count
    objective = await db.get(Objective, stable_id("bruma/objective/0"))
    objective.title = "Edición posterior del usuario"
    await db.commit()
    assert await populate(db, actor, readers) == result
    await db.commit()
    assert objective.title == "Edición posterior del usuario"
    for model, count in counts.items():
        assert await db.scalar(select(func.count()).select_from(model)) == count
    assert all(item.status == "draft" for item in await db.scalars(select(Diagnostic)))
    assert all(
        item.status == "borrador" and item.approved_at is None
        for item in await db.scalars(select(Minutes))
    )
    assert all(
        item.status == "borrador" and item.approved_at is None
        for item in await db.scalars(select(TechnicalReport))
    )
    for project in PROJECTS:
        cycle_id = stable_id(f"{project['key']}/cycle")
        progress = await summary(db, readers[0], cycle_id)
        assert progress.activities_total == 24
        assert progress.activities_completed == 9
        assert progress.progress_percent == 0  # No fabricated human approvals.
        activities = list(await db.scalars(select(Activity).where(Activity.cycle_id == cycle_id)))
        assert all(a.starts_on <= a.ends_on for a in activities)
        objectives = list(await db.scalars(select(Objective).where(Objective.cycle_id == cycle_id)))
        assert len({o.area_id for o in objectives}) == 6


async def test_revocation_is_not_undone(db):
    actor, readers = await prepare(db)
    await populate(db, actor, readers)
    await db.commit()
    from datetime import UTC, datetime

    assignment = await db.get(
        EntrepreneurshipAssignment, stable_id(f"bruma/assignment/{readers[0].id}")
    )
    assignment.revoked_at = datetime.now(UTC)
    await db.commit()
    with pytest.raises(ValueError, match="revocada"):
        await populate(db, actor, readers)
    await db.rollback()


async def test_batch_can_be_rolled_back(db):
    actor, readers = await prepare(db)
    await populate(db, actor, readers)
    await db.rollback()
    assert await db.scalar(select(func.count()).select_from(Entrepreneurship)) == 0
    assert await db.scalar(select(func.count()).select_from(AuditLog)) == 0


async def test_date_repair_is_explicit_and_preserves_edits(db):
    from datetime import date, timedelta

    actor, readers = await prepare(db)
    await populate(db, actor, readers)
    activity = await db.get(Activity, stable_id("bruma/activity/4/2"))
    activity.starts_on = date(2026, 9, 28)
    activity.ends_on = activity.starts_on + timedelta(days=10)
    await db.commit()
    assert await repair_demo_dates(db, actor) == 1
    await db.commit()
    assert await repair_demo_dates(db, actor) == 0
    activity.ends_on = date(2026, 10, 8)
    activity.revision = 3
    await db.commit()
    with pytest.raises(ValueError, match="modificada"):
        await repair_demo_dates(db, actor)
    await db.rollback()


async def test_real_postgres_migrations():
    import os
    import runpy
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy.engine import make_url
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    url = os.getenv("STAGING_DEMO_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requiere PostgreSQL desechable de pruebas")
    assert make_url(url).database == "sia_seed_test", "Solo base desechable sia_seed_test"
    test_engine = create_async_engine(url)

    def migrate(connection):
        versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
        with Operations.context(MigrationContext.configure(connection)):
            for version in sorted(versions.glob("*.py")):
                runpy.run_path(str(version))["upgrade"]()

    async with test_engine.begin() as connection:
        await connection.run_sync(migrate)
    sessions = async_sessionmaker(test_engine, expire_on_commit=False)
    async with sessions() as session:
        await test_complete_consistent_idempotent_demo(session)
    await test_engine.dispose()
