from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expediente import (
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.user import User


@dataclass(frozen=True)
class Scope:
    cycle_id: str
    entrepreneurship_id: str
    program: str


async def has_access(db: AsyncSession, user: User, scope: Scope) -> bool:
    if user.role == "Coordinadora":
        return True
    if user.role not in {"Gestor", "Emprendedor"}:
        return False
    direct = await db.scalar(
        select(EntrepreneurshipAssignment.id).where(
            EntrepreneurshipAssignment.entrepreneurship_id == scope.entrepreneurship_id,
            EntrepreneurshipAssignment.user_id == user.id,
            EntrepreneurshipAssignment.role == user.role,
            EntrepreneurshipAssignment.revoked_at.is_(None),
        )
    )
    specific = await db.scalar(
        select(ProgramCycleAssignment.id).where(
            ProgramCycleAssignment.program_cycle_id == scope.cycle_id,
            ProgramCycleAssignment.user_id == user.id,
            ProgramCycleAssignment.role == user.role,
            ProgramCycleAssignment.revoked_at.is_(None),
        )
    )
    return direct is not None or specific is not None


async def authorize_cycle(
    db: AsyncSession, user: User, cycle_id: str, *, lock: bool = False, validate: bool = False
) -> Scope:
    query = select(ProgramCycle).where(ProgramCycle.id == cycle_id)
    if lock:
        # All tracking mutations lock the same aggregate before reading its children.
        query = query.with_for_update()
    cycle = await db.scalar(query.execution_options(populate_existing=True))
    if cycle is None:
        raise HTTPException(404, "Ciclo no encontrado")
    enrollment = await db.get(ProgramEnrollment, cycle.enrollment_id)
    if enrollment is None:
        raise HTTPException(404, "Inscripción no encontrada")
    scope = Scope(cycle.id, enrollment.entrepreneurship_id, enrollment.program)
    if not await has_access(db, user, scope):
        raise HTTPException(403, "No autorizado para este ciclo")
    if validate and user.role not in {"Coordinadora", "Gestor"}:
        raise HTTPException(403, "Solo Gestor asignado o Coordinadora puede validar")
    if scope.program not in {"Prototipado", "Puesta en marcha"}:
        raise HTTPException(409, "El programa no tiene definición de seguimiento confirmada")
    return scope
