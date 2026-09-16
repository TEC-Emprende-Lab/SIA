from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
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
from app.modules.expediente.service import (
    assign_to_cycle,
    assign_to_entrepreneurship,
    create_cycle,
    create_enrollment,
    create_entrepreneurship,
    ensure_can_read_enrollment,
    get_cycle,
    get_enrollment,
    get_entrepreneurship,
    list_cycles,
    list_enrollments,
    list_entrepreneurships,
    revoke_assignment,
)
from app.schemas.expediente import (
    AssignmentCreate,
    AssignmentOut,
    EntrepreneurshipCreate,
    EntrepreneurshipOut,
    ProgramCycleCreate,
    ProgramCycleOut,
    ProgramEnrollmentCreate,
    ProgramEnrollmentOut,
    UUIDString,
)
from app.security.deps import get_current_user

router = APIRouter(prefix="/entrepreneurships", tags=["expediente"])


@router.post("", response_model=EntrepreneurshipOut, status_code=201)
async def post_entrepreneurship(
    payload: EntrepreneurshipCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Entrepreneurship:
    if user.role not in {"Coordinadora", "Gestor"}:
        raise HTTPException(status_code=403, detail="No autorizado para crear emprendimientos")
    return await create_entrepreneurship(db, user, payload.name)


@router.get("", response_model=list[EntrepreneurshipOut])
async def get_entrepreneurships(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[Entrepreneurship]:
    return await list_entrepreneurships(db, user, limit, offset)


@router.get("/{entrepreneurship_id}", response_model=EntrepreneurshipOut)
async def get_entrepreneurship_by_id(
    entrepreneurship_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Entrepreneurship:
    await ensure_can_access_entrepreneurship(db, user, entrepreneurship_id)
    return await get_entrepreneurship(db, entrepreneurship_id)


@router.post(
    "/{entrepreneurship_id}/enrollments", response_model=ProgramEnrollmentOut, status_code=201
)
async def post_enrollment(
    entrepreneurship_id: UUIDString,
    payload: ProgramEnrollmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgramEnrollment:
    await get_entrepreneurship(db, entrepreneurship_id)
    await ensure_can_manage_entrepreneurship(db, user, entrepreneurship_id)
    return await create_enrollment(
        db, user, entrepreneurship_id, payload.program, payload.enrolled_at
    )


@router.post("/{entrepreneurship_id}/assignments", response_model=AssignmentOut, status_code=201)
async def post_entrepreneurship_assignment(
    entrepreneurship_id: UUIDString,
    payload: AssignmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EntrepreneurshipAssignment:
    await get_entrepreneurship(db, entrepreneurship_id)
    await ensure_can_manage_entrepreneurship(db, user, entrepreneurship_id)
    ensure_can_assign_role(user, payload.role)
    return await assign_to_entrepreneurship(
        db, user, entrepreneurship_id, str(payload.user_id), payload.role
    )


@router.post("/enrollments/{enrollment_id}/cycles", response_model=ProgramCycleOut, status_code=201)
async def post_cycle(
    enrollment_id: UUIDString,
    payload: ProgramCycleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgramCycle:
    enrollment = await get_enrollment(db, enrollment_id)
    await ensure_can_manage_entrepreneurship(db, user, enrollment.entrepreneurship_id)
    return await create_cycle(db, user, enrollment, payload.name)


@router.post("/cycles/{cycle_id}/assignments", response_model=AssignmentOut, status_code=201)
async def post_cycle_assignment(
    cycle_id: UUIDString,
    payload: AssignmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgramCycleAssignment:
    cycle = await get_cycle(db, cycle_id)
    await ensure_can_access_cycle(db, user, cycle, manage=True)
    ensure_can_assign_role(user, payload.role)
    return await assign_to_cycle(db, user, cycle, str(payload.user_id), payload.role)


@router.get("/{entrepreneurship_id}/enrollments", response_model=list[ProgramEnrollmentOut])
async def get_enrollments(
    entrepreneurship_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[ProgramEnrollment]:
    return await list_enrollments(db, user, entrepreneurship_id, limit, offset)


@router.get("/enrollments/{enrollment_id}", response_model=ProgramEnrollmentOut)
async def get_enrollment_by_id(
    enrollment_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgramEnrollment:
    enrollment = await get_enrollment(db, enrollment_id)
    await ensure_can_read_enrollment(db, user, enrollment)
    return enrollment


@router.get("/enrollments/{enrollment_id}/cycles", response_model=list[ProgramCycleOut])
async def get_cycles(
    enrollment_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[ProgramCycle]:
    return await list_cycles(db, user, await get_enrollment(db, enrollment_id), limit, offset)


@router.get("/cycles/{cycle_id}", response_model=ProgramCycleOut)
async def get_cycle_by_id(
    cycle_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProgramCycle:
    cycle = await get_cycle(db, cycle_id)
    await ensure_can_access_cycle(db, user, cycle)
    return cycle


@router.delete("/{entrepreneurship_id}/assignments/{assignment_id}", response_model=AssignmentOut)
async def delete_entrepreneurship_assignment(
    entrepreneurship_id: UUIDString,
    assignment_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EntrepreneurshipAssignment | ProgramCycleAssignment:
    await ensure_can_manage_entrepreneurship(db, user, entrepreneurship_id)
    assignment = await db.get(EntrepreneurshipAssignment, assignment_id)
    if assignment is None or assignment.entrepreneurship_id != entrepreneurship_id:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    return await revoke_assignment(db, user, assignment)


@router.delete("/cycles/{cycle_id}/assignments/{assignment_id}", response_model=AssignmentOut)
async def delete_cycle_assignment(
    cycle_id: UUIDString,
    assignment_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EntrepreneurshipAssignment | ProgramCycleAssignment:
    await ensure_can_access_cycle(db, user, await get_cycle(db, cycle_id), manage=True)
    assignment = await db.get(ProgramCycleAssignment, assignment_id)
    if assignment is None or assignment.program_cycle_id != cycle_id:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    return await revoke_assignment(db, user, assignment)
