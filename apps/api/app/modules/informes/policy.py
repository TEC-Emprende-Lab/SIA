from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expediente import ProgramCycle, ProgramEnrollment
from app.models.user import User
from app.modules.expediente.policy import ensure_can_access_cycle


async def cycle_scope(
    db: AsyncSession, actor: User, cycle_id: str, *, manage: bool = False, lock: bool = False
) -> str:
    """Autoriza el ciclo y devuelve su entrepreneurship_id. ``manage`` exige
    Gestor asignado o Coordinadora (enviar/revisar/aprobar informes)."""
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
