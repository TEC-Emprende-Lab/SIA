from fastapi import HTTPException
from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expediente import (
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.user import User


async def ensure_can_access_entrepreneurship(
    db: AsyncSession, actor: User, entrepreneurship_id: str
) -> None:
    if actor.role == "Coordinadora":
        return
    direct_assignment = exists().where(
        EntrepreneurshipAssignment.entrepreneurship_id == entrepreneurship_id,
        EntrepreneurshipAssignment.user_id == actor.id,
        EntrepreneurshipAssignment.role == actor.role,
        EntrepreneurshipAssignment.revoked_at.is_(None),
    )
    cycle_assignment = exists().where(
        ProgramCycleAssignment.user_id == actor.id,
        ProgramCycleAssignment.role == actor.role,
        ProgramCycleAssignment.revoked_at.is_(None),
        ProgramCycleAssignment.program_cycle_id == ProgramCycle.id,
        ProgramCycle.enrollment_id == ProgramEnrollment.id,
        ProgramEnrollment.entrepreneurship_id == entrepreneurship_id,
    )
    allowed = await db.scalar(select(direct_assignment | cycle_assignment))
    if not allowed:
        raise HTTPException(status_code=403, detail="No autorizado para este emprendimiento")


async def ensure_can_manage_entrepreneurship(
    db: AsyncSession, actor: User, entrepreneurship_id: str
) -> None:
    if actor.role == "Coordinadora":
        return
    if actor.role != "Gestor":
        raise HTTPException(
            status_code=403, detail="No autorizado para administrar este emprendimiento"
        )
    manages = await db.scalar(
        select(
            exists().where(
                EntrepreneurshipAssignment.entrepreneurship_id == entrepreneurship_id,
                EntrepreneurshipAssignment.user_id == actor.id,
                EntrepreneurshipAssignment.role == "Gestor",
                EntrepreneurshipAssignment.revoked_at.is_(None),
            )
        )
    )
    if not manages:
        raise HTTPException(
            status_code=403, detail="No autorizado para administrar este emprendimiento"
        )


def ensure_can_assign_role(actor: User, role: str) -> None:
    if actor.role not in {"Coordinadora", "Gestor"}:
        raise HTTPException(status_code=403, detail="No autorizado para asignar usuarios")
    if role == "Gestor" and actor.role != "Coordinadora":
        raise HTTPException(status_code=403, detail="Solo Coordinadora puede asignar gestores")
    if role not in {"Gestor", "Emprendedor"}:
        raise HTTPException(status_code=400, detail="Rol de asignación inválido")


async def ensure_can_access_cycle(
    db: AsyncSession, actor: User, cycle: ProgramCycle, *, manage: bool = False
) -> None:
    if actor.role == "Coordinadora":
        return
    if manage and actor.role != "Gestor":
        raise HTTPException(status_code=403, detail="No autorizado para administrar este ciclo")
    enrollment = await db.get(ProgramEnrollment, cycle.enrollment_id)
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    direct = exists().where(
        EntrepreneurshipAssignment.entrepreneurship_id == enrollment.entrepreneurship_id,
        EntrepreneurshipAssignment.user_id == actor.id,
        EntrepreneurshipAssignment.role == actor.role,
        EntrepreneurshipAssignment.revoked_at.is_(None),
    )
    scoped = exists().where(
        ProgramCycleAssignment.program_cycle_id == cycle.id,
        ProgramCycleAssignment.user_id == actor.id,
        ProgramCycleAssignment.role == actor.role,
        ProgramCycleAssignment.revoked_at.is_(None),
    )
    if not await db.scalar(select(direct | scoped)):
        raise HTTPException(status_code=403, detail="No autorizado para este ciclo")
