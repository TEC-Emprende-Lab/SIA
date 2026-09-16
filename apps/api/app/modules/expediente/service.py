from datetime import UTC, datetime
from sqlite3 import SQLITE_CONSTRAINT_UNIQUE

from fastapi import HTTPException
from sqlalchemy import exists, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.models.expediente import (
    Entrepreneurship,
    EntrepreneurshipAssignment,
    ProgramCycle,
    ProgramCycleAssignment,
    ProgramEnrollment,
)
from app.models.user import User
from app.modules.expediente.policy import (
    ensure_can_access_cycle,
    ensure_can_access_entrepreneurship,
    ensure_can_assign_role,
    ensure_can_manage_entrepreneurship,
)


def _is_assignment_duplicate(exc: IntegrityError, *, cycle: bool) -> bool:
    """Recognize only the active-assignment unique index, not unrelated constraints."""
    constraint = "uq_cycle_active_assignment" if cycle else "uq_entrepreneurship_active_assignment"
    original = exc.orig
    # SQLAlchemy's asyncpg adapter retains the PostgreSQL exception as its cause.
    cause = getattr(original, "__cause__", None)
    if getattr(original, "sqlstate", None) == "23505":
        return getattr(cause, "constraint_name", None) == constraint
    table = "program_cycle_assignments" if cycle else "entrepreneurship_assignments"
    scope = "program_cycle_id" if cycle else "entrepreneurship_id"
    columns = ", ".join(f"{table}.{column}" for column in (scope, "user_id", "role"))
    return (
        getattr(original, "sqlite_errorcode", None) == SQLITE_CONSTRAINT_UNIQUE
        and str(original) == f"UNIQUE constraint failed: {columns}"
    )


async def create_entrepreneurship(db: AsyncSession, actor: User, name: str) -> Entrepreneurship:
    if actor.role not in {"Coordinadora", "Gestor"}:
        raise HTTPException(status_code=403, detail="No autorizado para crear emprendimientos")
    entrepreneurship = Entrepreneurship(name=name)
    db.add(entrepreneurship)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "entrepreneurship.created",
        "Entrepreneurship",
        entrepreneurship.id,
        after={"name": entrepreneurship.name},
    )
    await db.commit()
    await db.refresh(entrepreneurship)
    return entrepreneurship


async def get_entrepreneurship(db: AsyncSession, entrepreneurship_id: str) -> Entrepreneurship:
    entrepreneurship = await db.get(Entrepreneurship, entrepreneurship_id)
    if entrepreneurship is None:
        raise HTTPException(status_code=404, detail="Emprendimiento no encontrado")
    return entrepreneurship


async def list_entrepreneurships(
    db: AsyncSession, actor: User, limit: int = 50, offset: int = 0
) -> list[Entrepreneurship]:
    if actor.role == "Coordinadora":
        return list(
            (
                await db.scalars(
                    select(Entrepreneurship)
                    .order_by(Entrepreneurship.name, Entrepreneurship.id)
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
        )
    assignment = select(EntrepreneurshipAssignment.entrepreneurship_id).where(
        EntrepreneurshipAssignment.user_id == actor.id,
        EntrepreneurshipAssignment.role == actor.role,
        EntrepreneurshipAssignment.revoked_at.is_(None),
    )
    cycle_assignment = (
        select(ProgramEnrollment.entrepreneurship_id)
        .join(ProgramCycle, ProgramCycle.enrollment_id == ProgramEnrollment.id)
        .join(ProgramCycleAssignment, ProgramCycleAssignment.program_cycle_id == ProgramCycle.id)
        .where(
            ProgramCycleAssignment.user_id == actor.id,
            ProgramCycleAssignment.role == actor.role,
            ProgramCycleAssignment.revoked_at.is_(None),
        )
    )
    query = (
        select(Entrepreneurship)
        .where(Entrepreneurship.id.in_(assignment.union(cycle_assignment)))
        .order_by(Entrepreneurship.name, Entrepreneurship.id)
        .limit(limit)
        .offset(offset)
    )
    return list((await db.scalars(query)).all())


async def create_enrollment(
    db: AsyncSession, actor: User, entrepreneurship_id: str, program: str, enrolled_at: datetime
) -> ProgramEnrollment:
    await ensure_can_manage_entrepreneurship(db, actor, entrepreneurship_id)
    await get_entrepreneurship(db, entrepreneurship_id)
    if program == "Puesta en marcha":
        raise HTTPException(
            status_code=409, detail="TBD: validación de requisitos de entrada de Puesta en marcha"
        )
    if program != "Prototipado":
        raise HTTPException(status_code=422, detail="Programa no habilitado")
    if enrolled_at.tzinfo is None:
        raise HTTPException(status_code=422, detail="La fecha de ingreso debe incluir zona horaria")
    enrollment = ProgramEnrollment(
        entrepreneurship_id=entrepreneurship_id,
        program=program,
        enrolled_at=enrolled_at.astimezone(UTC),
    )
    db.add(enrollment)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "program_enrollment.created",
        "ProgramEnrollment",
        enrollment.id,
        after={
            "entrepreneurship_id": entrepreneurship_id,
            "program": program,
            "enrolled_at": enrollment.enrolled_at.isoformat(),
        },
    )
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def create_cycle(
    db: AsyncSession, actor: User, enrollment: ProgramEnrollment, name: str
) -> ProgramCycle:
    await ensure_can_manage_entrepreneurship(db, actor, enrollment.entrepreneurship_id)
    cycle = ProgramCycle(enrollment_id=enrollment.id, name=name)
    db.add(cycle)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "program_cycle.created",
        "ProgramCycle",
        cycle.id,
        after={"enrollment_id": enrollment.id, "name": name},
    )
    await db.commit()
    await db.refresh(cycle)
    return cycle


async def get_enrollment(db: AsyncSession, enrollment_id: str) -> ProgramEnrollment:
    enrollment = await db.get(ProgramEnrollment, enrollment_id)
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    return enrollment


async def get_cycle(db: AsyncSession, cycle_id: str) -> ProgramCycle:
    cycle = await db.get(ProgramCycle, cycle_id)
    if cycle is None:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return cycle


async def assign_to_entrepreneurship(
    db: AsyncSession, actor: User, entrepreneurship_id: str, user_id: str, role: str
) -> EntrepreneurshipAssignment:
    await ensure_can_manage_entrepreneurship(db, actor, entrepreneurship_id)
    ensure_can_assign_role(actor, role)
    await get_entrepreneurship(db, entrepreneurship_id)
    await _ensure_user_role(db, user_id, role)
    assignment = EntrepreneurshipAssignment(
        entrepreneurship_id=entrepreneurship_id, user_id=user_id, role=role
    )
    db.add(assignment)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if not _is_assignment_duplicate(exc, cycle=False):
            raise
        raise HTTPException(status_code=409, detail="La asignación ya existe") from exc
    await write_audit(
        db,
        actor.id,
        "entrepreneurship_assignment.created",
        "EntrepreneurshipAssignment",
        assignment.id,
        after={"entrepreneurship_id": entrepreneurship_id, "user_id": user_id, "role": role},
    )
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def assign_to_cycle(
    db: AsyncSession, actor: User, cycle: ProgramCycle, user_id: str, role: str
) -> ProgramCycleAssignment:
    await ensure_can_access_cycle(db, actor, cycle, manage=True)
    ensure_can_assign_role(actor, role)
    await _ensure_user_role(db, user_id, role)
    assignment = ProgramCycleAssignment(program_cycle_id=cycle.id, user_id=user_id, role=role)
    db.add(assignment)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        if not _is_assignment_duplicate(exc, cycle=True):
            raise
        raise HTTPException(status_code=409, detail="La asignación ya existe") from exc
    await write_audit(
        db,
        actor.id,
        "program_cycle_assignment.created",
        "ProgramCycleAssignment",
        assignment.id,
        after={"program_cycle_id": cycle.id, "user_id": user_id, "role": role},
    )
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def _ensure_user_role(db: AsyncSession, user_id: str, role: str) -> None:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.role != role:
        raise HTTPException(status_code=400, detail="El rol no coincide con el usuario")


async def list_enrollments(
    db: AsyncSession, actor: User, entrepreneurship_id: str, limit: int = 50, offset: int = 0
) -> list[ProgramEnrollment]:
    await ensure_can_access_entrepreneurship(db, actor, entrepreneurship_id)
    await get_entrepreneurship(db, entrepreneurship_id)
    query = select(ProgramEnrollment).where(
        ProgramEnrollment.entrepreneurship_id == entrepreneurship_id
    )
    if actor.role != "Coordinadora":
        direct = exists().where(
            EntrepreneurshipAssignment.entrepreneurship_id == entrepreneurship_id,
            EntrepreneurshipAssignment.user_id == actor.id,
            EntrepreneurshipAssignment.role == actor.role,
            EntrepreneurshipAssignment.revoked_at.is_(None),
        )
        scoped = exists().where(
            ProgramCycle.enrollment_id == ProgramEnrollment.id,
            ProgramCycleAssignment.program_cycle_id == ProgramCycle.id,
            ProgramCycleAssignment.user_id == actor.id,
            ProgramCycleAssignment.role == actor.role,
            ProgramCycleAssignment.revoked_at.is_(None),
        )
        query = query.where(direct | scoped)
    return list(
        (
            await db.scalars(
                query.order_by(ProgramEnrollment.enrolled_at, ProgramEnrollment.id)
                .limit(limit)
                .offset(offset)
            )
        ).all()
    )


async def ensure_can_read_enrollment(
    db: AsyncSession, actor: User, enrollment: ProgramEnrollment
) -> None:
    if actor.role == "Coordinadora":
        return
    direct = exists().where(
        EntrepreneurshipAssignment.entrepreneurship_id == enrollment.entrepreneurship_id,
        EntrepreneurshipAssignment.user_id == actor.id,
        EntrepreneurshipAssignment.role == actor.role,
        EntrepreneurshipAssignment.revoked_at.is_(None),
    )
    scoped = exists().where(
        ProgramCycle.enrollment_id == enrollment.id,
        ProgramCycleAssignment.program_cycle_id == ProgramCycle.id,
        ProgramCycleAssignment.user_id == actor.id,
        ProgramCycleAssignment.role == actor.role,
        ProgramCycleAssignment.revoked_at.is_(None),
    )
    if not await db.scalar(select(direct | scoped)):
        raise HTTPException(status_code=403, detail="No autorizado para esta inscripción")


async def list_cycles(
    db: AsyncSession, actor: User, enrollment: ProgramEnrollment, limit: int = 50, offset: int = 0
) -> list[ProgramCycle]:
    await ensure_can_read_enrollment(db, actor, enrollment)
    query = select(ProgramCycle).where(ProgramCycle.enrollment_id == enrollment.id)
    if actor.role != "Coordinadora":
        direct = exists().where(
            EntrepreneurshipAssignment.entrepreneurship_id == enrollment.entrepreneurship_id,
            EntrepreneurshipAssignment.user_id == actor.id,
            EntrepreneurshipAssignment.role == actor.role,
            EntrepreneurshipAssignment.revoked_at.is_(None),
        )
        scoped = exists().where(
            ProgramCycleAssignment.program_cycle_id == ProgramCycle.id,
            ProgramCycleAssignment.user_id == actor.id,
            ProgramCycleAssignment.role == actor.role,
            ProgramCycleAssignment.revoked_at.is_(None),
        )
        query = query.where(direct | scoped)
    return list(
        (
            await db.scalars(
                query.order_by(ProgramCycle.created_at, ProgramCycle.id).limit(limit).offset(offset)
            )
        ).all()
    )


async def revoke_assignment(
    db: AsyncSession,
    actor: User,
    assignment: EntrepreneurshipAssignment | ProgramCycleAssignment,
) -> EntrepreneurshipAssignment | ProgramCycleAssignment:
    if isinstance(assignment, EntrepreneurshipAssignment):
        await ensure_can_manage_entrepreneurship(db, actor, assignment.entrepreneurship_id)
        scope = {"entrepreneurship_id": assignment.entrepreneurship_id}
        action = "entrepreneurship_assignment.revoked"
    else:
        await ensure_can_access_cycle(
            db, actor, await get_cycle(db, assignment.program_cycle_id), manage=True
        )
        scope = {"program_cycle_id": assignment.program_cycle_id}
        action = "program_cycle_assignment.revoked"
    ensure_can_assign_role(actor, assignment.role)
    now = datetime.now(UTC)
    model = type(assignment)
    changed = await db.scalar(
        update(model)
        .where(model.id == assignment.id, model.revoked_at.is_(None))
        .values(revoked_at=now)
        .returning(model.id)
    )
    if changed is None:
        raise HTTPException(status_code=409, detail="La asignación ya está revocada")
    before = {**scope, "user_id": assignment.user_id, "role": assignment.role, "revoked_at": None}
    await write_audit(
        db,
        actor.id,
        action,
        model.__name__,
        assignment.id,
        before=before,
        after={**before, "revoked_at": now.isoformat()},
    )
    await db.commit()
    await db.refresh(assignment)
    return assignment
