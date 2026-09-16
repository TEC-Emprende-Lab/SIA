from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.seguimiento import Activity, Diagnostic, Objective, Validation
from app.models.user import User
from app.modules.seguimiento import service
from app.schemas.seguimiento import (
    ActivityCompletion,
    ActivityCreate,
    ActivityOut,
    ActivityUpdate,
    AmbitionCreate,
    AmbitionOut,
    AmbitionUpdate,
    CanvasOut,
    DiagnosticComparison,
    DiagnosticCreate,
    DiagnosticOut,
    DiagnosticUpdate,
    EvidenceCreate,
    EvidenceOut,
    ObjectiveCreate,
    ObjectiveOut,
    ObjectiveUpdate,
    Revision,
    ScheduleItem,
    ValidationCreate,
    ValidationOut,
)
from app.security.deps import get_current_user

router = APIRouter(prefix="/cycles/{cycle_id}/seguimiento", tags=["seguimiento"])
DB = Annotated[AsyncSession, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]


@router.get("/canvas", response_model=CanvasOut)
async def get_canvas(cycle_id: str, db: DB, user: Actor) -> CanvasOut:
    return await service.canvas(db, user, cycle_id)


@router.get("/ambitions", response_model=list[AmbitionOut])
async def get_ambitions(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "ambitions")


@router.post("/ambitions", response_model=AmbitionOut, status_code=201)
async def create_ambition(
    cycle_id: str, payload: AmbitionCreate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload)


@router.put("/ambitions/{entity_id}", response_model=AmbitionOut)
async def update_ambition(
    cycle_id: str, entity_id: str, payload: AmbitionUpdate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload, entity_id)


@router.get("/objectives", response_model=list[ObjectiveOut])
async def get_objectives(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "objectives")


@router.post("/objectives", response_model=ObjectiveOut, status_code=201)
async def create_objective(
    cycle_id: str, payload: ObjectiveCreate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload)


@router.put("/objectives/{entity_id}", response_model=ObjectiveOut)
async def update_objective(
    cycle_id: str, entity_id: str, payload: ObjectiveUpdate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload, entity_id)


@router.post("/objectives/{entity_id}/submit", response_model=ObjectiveOut)
async def submit_objective(
    cycle_id: str, entity_id: str, payload: Revision, db: DB, user: Actor
) -> Objective | Diagnostic:
    return await service.submit(db, user, cycle_id, Objective, entity_id, payload.expected_revision)


@router.post("/objectives/{entity_id}/validations", response_model=ValidationOut, status_code=201)
async def validate_objective(
    cycle_id: str, entity_id: str, payload: ValidationCreate, db: DB, user: Actor
) -> Validation:
    return await service.validate(db, user, cycle_id, Objective, entity_id, payload)


@router.get("/activities", response_model=list[ActivityOut])
async def get_activities(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "activities")


@router.post("/activities", response_model=ActivityOut, status_code=201)
async def create_activity(
    cycle_id: str, payload: ActivityCreate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload)


@router.put("/activities/{entity_id}", response_model=ActivityOut)
async def update_activity(
    cycle_id: str, entity_id: str, payload: ActivityUpdate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload, entity_id)


@router.post("/activities/{entity_id}/completion", response_model=ActivityOut)
async def complete_activity(
    cycle_id: str, entity_id: str, payload: ActivityCompletion, db: DB, user: Actor
) -> Activity:
    return await service.complete_activity(db, user, cycle_id, entity_id, payload)


@router.get("/evidence", response_model=list[EvidenceOut])
async def get_evidence(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "evidence")


@router.post("/evidence", response_model=EvidenceOut, status_code=201)
async def create_evidence(
    cycle_id: str, payload: EvidenceCreate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload)


@router.get("/diagnostics", response_model=list[DiagnosticOut])
async def get_diagnostics(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "diagnostics")


@router.post("/diagnostics", response_model=DiagnosticOut, status_code=201)
async def create_diagnostic(
    cycle_id: str, payload: DiagnosticCreate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload)


@router.put("/diagnostics/{entity_id}", response_model=DiagnosticOut)
async def update_diagnostic(
    cycle_id: str, entity_id: str, payload: DiagnosticUpdate, db: DB, user: Actor
) -> service.Entity:
    return await service.save(db, user, cycle_id, payload, entity_id)


@router.post("/diagnostics/{entity_id}/submit", response_model=DiagnosticOut)
async def submit_diagnostic(
    cycle_id: str, entity_id: str, payload: Revision, db: DB, user: Actor
) -> Objective | Diagnostic:
    return await service.submit(
        db, user, cycle_id, Diagnostic, entity_id, payload.expected_revision
    )


@router.post("/diagnostics/{entity_id}/validations", response_model=ValidationOut, status_code=201)
async def validate_diagnostic(
    cycle_id: str, entity_id: str, payload: ValidationCreate, db: DB, user: Actor
) -> Validation:
    return await service.validate(db, user, cycle_id, Diagnostic, entity_id, payload)


@router.get("/diagnostics/compare/{previous_id}/{current_id}", response_model=DiagnosticComparison)
async def compare_diagnostics(
    cycle_id: str, previous_id: str, current_id: str, db: DB, user: Actor
) -> DiagnosticComparison:
    return await service.compare(db, user, cycle_id, previous_id, current_id)


@router.get("/validations", response_model=list[ValidationOut])
async def get_validations(cycle_id: str, db: DB, user: Actor) -> list[service.Entity]:
    return await service.list_records(db, user, cycle_id, "validations")


@router.get("/schedule", response_model=list[ScheduleItem])
async def get_schedule(cycle_id: str, db: DB, user: Actor) -> list[ScheduleItem]:
    return await service.schedule(db, user, cycle_id)
