"""US-PRO-001/002/005/006, US-PM-001/002.

The workflow names encode only documented actions, not program exit criteria.
No automatic completion, scoring scales, mandatory deliverables or stage gates.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any, Literal, cast

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.db.base import Base
from app.models.seguimiento import (
    Activity,
    Ambition,
    CanvasArea,
    CycleCanvas,
    Diagnostic,
    Evidence,
    Objective,
    ProgramCanvas,
    Validation,
)
from app.models.user import User
from app.modules.seguimiento.policy import Scope, authorize_cycle, has_access
from app.schemas.seguimiento import (
    ActivityCompletion,
    ActivityCreate,
    ActivityUpdate,
    AmbitionCreate,
    AmbitionUpdate,
    AreaOut,
    CanvasOut,
    ComparisonArea,
    DiagnosticComparison,
    DiagnosticCreate,
    DiagnosticUpdate,
    EvidenceCreate,
    Input,
    ObjectiveCreate,
    ObjectiveUpdate,
    ScheduleItem,
    ValidationCreate,
)

Resource = Literal[
    "ambitions", "objectives", "activities", "evidence", "diagnostics", "validations"
]
Entity = Ambition | Objective | Activity | Evidence | Diagnostic | Validation
MODELS: dict[Resource, type[Entity]] = {
    "ambitions": Ambition,
    "objectives": Objective,
    "activities": Activity,
    "evidence": Evidence,
    "diagnostics": Diagnostic,
    "validations": Validation,
}


def snapshot(entity: Base) -> dict[str, Any]:
    result = {}
    for column in inspect(type(entity)).columns:
        value = getattr(entity, column.key)
        if isinstance(value, datetime) and value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        result[column.key] = jsonable_encoder(value)
    return result


def check_revision(entity: Ambition | Objective | Activity | Diagnostic, expected: int) -> None:
    if entity.revision != expected:
        raise HTTPException(409, "La revisión cambió; vuelve a consultar antes de guardar")


@asynccontextmanager
async def transaction(db: AsyncSession) -> AsyncIterator[None]:
    try:
        yield
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "Conflicto de integridad o escritura concurrente") from exc
    except Exception:
        await db.rollback()
        raise


async def audit(
    db: AsyncSession, actor: User, entity: Base, action: str, before: dict[str, Any] | None = None
) -> None:
    await db.flush()
    await write_audit(
        db,
        actor.id,
        f"seguimiento.{action}",
        type(entity).__name__,
        str(getattr(entity, "id", getattr(entity, "cycle_id", ""))),
        before,
        snapshot(entity),
    )


async def canvas_definition(db: AsyncSession, scope: Scope, *, pin: bool = False) -> ProgramCanvas:
    binding = await db.get(CycleCanvas, scope.cycle_id)
    if binding:
        canvas = await db.get(ProgramCanvas, binding.canvas_id)
        if binding.entrepreneurship_id != scope.entrepreneurship_id:
            raise HTTPException(409, "El ciclo no coincide con el expediente de seguimiento")
    else:
        canvas = await db.scalar(
            select(ProgramCanvas).where(
                ProgramCanvas.program == scope.program, ProgramCanvas.version == 1
            )
        )
    if canvas is None or canvas.program != scope.program:
        raise HTTPException(409, "Falta la definición oficial del canvas; aplicar migración 003")
    if pin and binding is None:
        db.add(
            CycleCanvas(
                cycle_id=scope.cycle_id,
                canvas_id=canvas.id,
                entrepreneurship_id=scope.entrepreneurship_id,
            )
        )
        await db.flush()
    return canvas


async def canvas(db: AsyncSession, actor: User, cycle_id: str) -> CanvasOut:
    scope = await authorize_cycle(db, actor, cycle_id)
    definition = await canvas_definition(db, scope)
    areas = (
        await db.scalars(
            select(CanvasArea)
            .where(CanvasArea.canvas_id == definition.id)
            .order_by(CanvasArea.position)
        )
    ).all()
    return CanvasOut(
        id=definition.id,
        program=definition.program,
        version=definition.version,
        areas=[AreaOut.model_validate(area) for area in areas],
    )


async def scoped_entity[T: Base](
    db: AsyncSession, scope: Scope, model: type[T], entity_id: str
) -> T:
    scope_column = getattr(model, "entrepreneurship_id" if model is Ambition else "cycle_id")
    scope_id = scope.entrepreneurship_id if model is Ambition else scope.cycle_id
    query = select(model).where(getattr(model, "id") == entity_id, scope_column == scope_id)
    if model is Ambition:
        # Ambitions are shared across this entrepreneurship's cycles.
        query = query.with_for_update()
    entity = await db.scalar(query.execution_options(populate_existing=True))
    if entity is None:
        raise HTTPException(404, "Registro no encontrado en este ámbito")
    return entity


async def list_records(
    db: AsyncSession, actor: User, cycle_id: str, resource: Resource
) -> list[Entity]:
    scope = await authorize_cycle(db, actor, cycle_id)
    model = MODELS[resource]
    scope_column = getattr(model, "entrepreneurship_id" if model is Ambition else "cycle_id")
    scope_id = scope.entrepreneurship_id if model is Ambition else scope.cycle_id
    return cast(
        list[Entity],
        list(
            (
                await db.scalars(
                    select(model)
                    .where(scope_column == scope_id)
                    .order_by(model.created_at, model.id)
                )
            ).all()
        ),
    )


async def reopen(db: AsyncSession, actor: User, objective: Objective) -> None:
    before = snapshot(objective)
    objective.revision += 1
    if objective.status == "approved":
        objective.status = "pending_validation"
    await audit(db, actor, objective, "objective.work_changed", before)


async def validate_references(
    db: AsyncSession, scope: Scope, definition: ProgramCanvas, payload: Input
) -> None:
    if isinstance(payload, ObjectiveCreate):
        area = await db.get(CanvasArea, payload.area_id)
        if area is None or area.canvas_id != definition.id:
            raise HTTPException(422, "El área no pertenece al canvas del ciclo")
        if payload.ambition_id is not None:
            await scoped_entity(db, scope, Ambition, payload.ambition_id)
    if isinstance(payload, ActivityCreate):
        await scoped_entity(db, scope, Objective, payload.objective_id)
        responsible = await db.get(User, payload.responsible_id)
        if responsible is None or not await has_access(db, responsible, scope):
            raise HTTPException(422, "El responsable no tiene acceso al ciclo")
    if isinstance(payload, EvidenceCreate):
        await scoped_entity(db, scope, Activity, payload.activity_id)
    if isinstance(payload, DiagnosticCreate):
        area_ids = set(
            (
                await db.scalars(select(CanvasArea.id).where(CanvasArea.canvas_id == definition.id))
            ).all()
        )
        if len(payload.assessments) != 6 or {a.area_id for a in payload.assessments} != area_ids:
            raise HTTPException(422, "Evalúa exactamente las seis áreas del canvas, sin duplicados")
        if payload.supersedes_id:
            previous = await scoped_entity(db, scope, Diagnostic, payload.supersedes_id)
            if previous.status != "approved" or previous.canvas_id != definition.id:
                raise HTTPException(
                    409, "La fotografía anterior debe estar aprobada y usar el mismo canvas"
                )
            if payload.assessed_on < previous.assessed_on:
                raise HTTPException(422, "La nueva fotografía no puede preceder a la anterior")


async def save(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    payload: AmbitionCreate | ObjectiveCreate | ActivityCreate | EvidenceCreate | DiagnosticCreate,
    entity_id: str | None = None,
) -> Entity:
    # Subclasses must precede AmbitionCreate in dispatch.
    model: type[Ambition | Objective | Activity | Evidence | Diagnostic]
    if isinstance(payload, ObjectiveCreate):
        model = Objective
    elif isinstance(payload, ActivityCreate):
        model = Activity
    elif isinstance(payload, EvidenceCreate):
        model = Evidence
    elif isinstance(payload, DiagnosticCreate):
        model = Diagnostic
    else:
        model = Ambition
    async with transaction(db):
        scope = await authorize_cycle(db, actor, cycle_id, lock=True)
        definition = await canvas_definition(db, scope, pin=True)
        await validate_references(db, scope, definition, payload)
        values = payload.model_dump(mode="json", exclude={"expected_revision"})
        # SQL Date columns require dates, not JSON strings.
        if isinstance(payload, ActivityCreate):
            values.update(starts_on=payload.starts_on, ends_on=payload.ends_on)
        if isinstance(payload, DiagnosticCreate):
            values["assessed_on"] = payload.assessed_on
        before = None
        if entity_id is not None:
            entity = await scoped_entity(db, scope, model, entity_id)
            if isinstance(entity, Evidence) or not isinstance(
                payload, (AmbitionUpdate, ObjectiveUpdate, ActivityUpdate, DiagnosticUpdate)
            ):
                raise HTTPException(409, "La evidencia es inmutable; registra una nueva referencia")
            check_revision(entity, payload.expected_revision)
            if isinstance(entity, Diagnostic) and entity.status == "approved":
                raise HTTPException(409, "La fotografía aprobada es inmutable; crea una nueva")
            if isinstance(entity, Activity) and entity.objective_id != values["objective_id"]:
                raise HTTPException(409, "La actividad no puede cambiar de objetivo histórico")
            if isinstance(entity, Diagnostic) and entity.supersedes_id != values["supersedes_id"]:
                raise HTTPException(409, "No se puede cambiar la fotografía de origen")
            before = snapshot(entity)
            changed = any(getattr(entity, key) != value for key, value in values.items())
            if not changed:
                return entity
            for key, value in values.items():
                setattr(entity, key, value)
            entity.revision += 1
            if isinstance(entity, Objective) and entity.status == "approved":
                entity.status = "pending_validation"
        else:
            if model is Ambition:
                values["entrepreneurship_id"] = scope.entrepreneurship_id
            else:
                values["cycle_id"] = scope.cycle_id
            if model in (Objective, Diagnostic):
                values.update(
                    canvas_id=definition.id, entrepreneurship_id=scope.entrepreneurship_id
                )
            if model in (Evidence, Diagnostic):
                values["created_by"] = actor.id
            entity = model(**values)
            db.add(entity)
        await audit(db, actor, entity, "updated" if before else "created", before)
        if isinstance(entity, (Activity, Evidence)):
            objective_id = (
                entity.objective_id
                if isinstance(entity, Activity)
                else (await scoped_entity(db, scope, Activity, entity.activity_id)).objective_id
            )
            await reopen(db, actor, await scoped_entity(db, scope, Objective, objective_id))
    return entity


async def complete_activity(
    db: AsyncSession, actor: User, cycle_id: str, entity_id: str, payload: ActivityCompletion
) -> Activity:
    async with transaction(db):
        scope = await authorize_cycle(db, actor, cycle_id, lock=True)
        entity = await scoped_entity(db, scope, Activity, entity_id)
        check_revision(entity, payload.expected_revision)
        if bool(entity.completed_at) != payload.completed:
            before = snapshot(entity)
            entity.completed_at = datetime.now(UTC) if payload.completed else None
            entity.revision += 1
            await audit(db, actor, entity, "activity.completion", before)
            await reopen(db, actor, await scoped_entity(db, scope, Objective, entity.objective_id))
    return entity


async def submit(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    model: type[Objective] | type[Diagnostic],
    entity_id: str,
    expected_revision: int,
) -> Objective | Diagnostic:
    async with transaction(db):
        scope = await authorize_cycle(db, actor, cycle_id, lock=True)
        entity = await scoped_entity(db, scope, model, entity_id)
        check_revision(entity, expected_revision)
        if entity.status not in {"draft", "correction_requested", "rejected"}:
            raise HTTPException(409, "El registro no está disponible para envío")
        before = snapshot(entity)
        entity.status = "pending_validation"
        entity.revision += 1
        await audit(db, actor, entity, "submitted", before)
    return entity


async def objective_snapshot(db: AsyncSession, objective: Objective) -> dict[str, Any]:
    activities = list(
        (
            await db.scalars(
                select(Activity)
                .where(
                    Activity.objective_id == objective.id, Activity.cycle_id == objective.cycle_id
                )
                .order_by(Activity.id)
            )
        ).all()
    )
    references = list(
        (
            await db.scalars(
                select(Evidence)
                .join(Activity, Evidence.activity_id == Activity.id)
                .where(
                    Activity.objective_id == objective.id, Evidence.cycle_id == objective.cycle_id
                )
                .order_by(Evidence.id)
            )
        ).all()
    )
    return {
        **snapshot(objective),
        "activities": [snapshot(activity) for activity in activities],
        "evidence": [snapshot(evidence) for evidence in references],
    }


async def validate(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    model: type[Objective] | type[Diagnostic],
    entity_id: str,
    payload: ValidationCreate,
) -> Validation:
    async with transaction(db):
        scope = await authorize_cycle(db, actor, cycle_id, lock=True, validate=True)
        entity = await scoped_entity(db, scope, model, entity_id)
        check_revision(entity, payload.expected_revision)
        if entity.status != "pending_validation":
            raise HTTPException(409, "Solo se valida una revisión pendiente")
        frozen = (
            await objective_snapshot(db, entity)
            if isinstance(entity, Objective)
            else snapshot(entity)
        )
        if (
            isinstance(entity, Objective)
            and payload.decision == "approve"
            and not frozen["activities"]
        ):
            raise HTTPException(409, "Desagrega el objetivo en actividades antes de aprobar")
        before = snapshot(entity)
        decision = Validation(
            cycle_id=cycle_id,
            objective_id=entity.id if isinstance(entity, Objective) else None,
            diagnostic_id=entity.id if isinstance(entity, Diagnostic) else None,
            actor_id=actor.id,
            decision=payload.decision,
            observation=payload.observation,
            entity_revision=entity.revision,
            snapshot=frozen,
        )
        db.add(decision)
        entity.status = {
            "approve": "approved",
            "request_correction": "correction_requested",
            "reject": "rejected",
        }[payload.decision]
        entity.revision += 1
        await audit(db, actor, entity, "validated", before)
        await audit(db, actor, decision, "validation.created")
    return decision


async def schedule(db: AsyncSession, actor: User, cycle_id: str) -> list[ScheduleItem]:
    await authorize_cycle(db, actor, cycle_id)
    rows = (
        await db.execute(
            select(Activity, Objective)
            .join(Objective, Activity.objective_id == Objective.id)
            .where(Activity.cycle_id == cycle_id, Objective.cycle_id == cycle_id)
            .order_by(Activity.starts_on, Activity.ends_on, Activity.id)
        )
    ).all()
    return [
        ScheduleItem(
            **snapshot(activity), area_id=objective.area_id, deliverable=objective.deliverable
        )
        for activity, objective in rows
    ]


async def compare(
    db: AsyncSession, actor: User, cycle_id: str, previous_id: str, current_id: str
) -> DiagnosticComparison:
    scope = await authorize_cycle(db, actor, cycle_id)
    previous = await scoped_entity(db, scope, Diagnostic, previous_id)
    current = await scoped_entity(db, scope, Diagnostic, current_id)
    if previous.status != "approved" or current.status != "approved":
        raise HTTPException(409, "La comparación requiere fotografías aprobadas")
    if previous.canvas_id != current.canvas_id or previous.assessed_on > current.assessed_on:
        raise HTTPException(
            409, "Las fotografías deben compartir canvas y estar en orden cronológico"
        )
    old = {item["area_id"]: item["observation"] for item in previous.assessments}
    return DiagnosticComparison(
        previous_id=previous.id,
        current_id=current.id,
        canvas_id=current.canvas_id,
        areas=[
            ComparisonArea(
                area_id=item["area_id"], before=old[item["area_id"]], after=item["observation"]
            )
            for item in current.assessments
        ],
    )
