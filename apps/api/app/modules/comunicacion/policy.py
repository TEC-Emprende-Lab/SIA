from fastapi import HTTPException
from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramEnrollment,
)
from app.models.user import User
from app.modules.expediente.policy import (
    ensure_can_access_cycle,
    ensure_can_access_entrepreneurship,
)


async def cycle_scope(
    db: AsyncSession, actor: User, cycle_id: str, *, manage: bool = False, lock: bool = False
) -> str:
    query = select(ProgramCycle).where(ProgramCycle.id == cycle_id)
    if lock:
        query = query.with_for_update()
    cycle = await db.scalar(query.execution_options(populate_existing=True))
    if cycle is None:
        raise HTTPException(404, "Ciclo no encontrado")
    await ensure_can_access_cycle(db, actor, cycle, manage=manage)
    enrollment = await db.get(ProgramEnrollment, cycle.enrollment_id)
    assert enrollment is not None
    if enrollment.program not in {"Prototipado", "Puesta en marcha"}:
        raise HTTPException(409, "Programa fuera del alcance inicial")
    return enrollment.entrepreneurship_id


async def scope(
    db: AsyncSession,
    actor: User,
    entrepreneurship_id: str,
    cycle_id: str | None,
    *,
    manage: bool = False,
) -> None:
    if actor.role not in {"Coordinadora", "Gestor", "Emprendedor"}:
        raise HTTPException(403, "Rol no autorizado")
    if cycle_id is not None:
        actual = await cycle_scope(db, actor, cycle_id, manage=manage)
        if actual != entrepreneurship_id:
            raise HTTPException(404, "Ciclo ajeno al emprendimiento")
        return
    if await db.get(Entrepreneurship, entrepreneurship_id) is None:
        raise HTTPException(404, "Emprendimiento no encontrado")
    await ensure_can_access_entrepreneurship(db, actor, entrepreneurship_id)
    if actor.role == "Coordinadora":
        return
    # Expediente includes cycle-only assignments for summary access. Shared chat
    # requires a direct assignment so that it cannot leak sibling-cycle content.
    direct = await db.scalar(
        select(
            exists().where(
                EntrepreneurshipAssignment.entrepreneurship_id == entrepreneurship_id,
                EntrepreneurshipAssignment.user_id == actor.id,
                EntrepreneurshipAssignment.role == actor.role,
                EntrepreneurshipAssignment.revoked_at.is_(None),
            )
        )
    )
    if not direct or (manage and actor.role != "Gestor"):
        raise HTTPException(403, "No autorizado para este ámbito")


async def recipient(
    db: AsyncSession, user_id: str, entrepreneurship_id: str, cycle_id: str | None
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(422, "Destinatario no autorizado")
    try:
        await scope(db, user, entrepreneurship_id, cycle_id)
    except HTTPException as exc:
        raise HTTPException(422, "Destinatario no autorizado") from exc
    return user
