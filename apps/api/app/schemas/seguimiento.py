from datetime import UTC, date, datetime
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    field_validator,
    model_validator,
)

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Text = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20000)]
Status = Literal["draft", "pending_validation", "approved", "correction_requested", "rejected"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Revision(Input):
    expected_revision: int = Field(ge=1)


class AmbitionCreate(Input):
    title: Title
    description: Text = ""


class AmbitionUpdate(AmbitionCreate, Revision):
    pass


class ObjectiveCreate(AmbitionCreate):
    area_id: str
    ambition_id: str | None = None
    deliverable: Title | None = None


class ObjectiveUpdate(ObjectiveCreate, Revision):
    pass


class ActivityCreate(AmbitionCreate):
    objective_id: str
    responsible_id: str
    starts_on: date
    ends_on: date

    @model_validator(mode="after")
    def ordered_dates(self) -> Self:
        if self.starts_on > self.ends_on:
            raise ValueError("La fecha inicial no puede superar la final")
        return self


class ActivityUpdate(ActivityCreate, Revision):
    pass


class ActivityCompletion(Revision):
    completed: bool


class EvidenceCreate(AmbitionCreate):
    activity_id: str
    kind: Literal["link", "file", "photograph", "video"] = "link"
    url: HttpUrl = Field(max_length=2048)


class Assessment(Input):
    area_id: str
    observation: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)
    ]


class DiagnosticCreate(Input):
    assessed_on: date
    assessments: list[Assessment] = Field(min_length=6, max_length=6)
    supersedes_id: str | None = None


class DiagnosticUpdate(DiagnosticCreate, Revision):
    pass


class ValidationCreate(Revision):
    decision: Literal["approve", "request_correction", "reject"]
    observation: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20000)
    ]


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="before")
    @classmethod
    def utc_dates(cls, value: object) -> object:
        # SQLite's test adapter drops timezone information; stored timestamps are UTC.
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class AreaOut(Output):
    id: str
    canvas_id: str
    key: str
    name: str
    description: str
    position: int


class CanvasOut(Output):
    id: str
    program: str
    version: int
    areas: list[AreaOut]


class AmbitionOut(Output):
    id: str
    entrepreneurship_id: str
    title: str
    description: str
    revision: int
    created_at: datetime


class ObjectiveOut(AmbitionOut):
    cycle_id: str
    canvas_id: str
    area_id: str
    ambition_id: str | None
    deliverable: str | None
    status: Status


class ActivityOut(Output):
    id: str
    cycle_id: str
    objective_id: str
    title: str
    description: str
    responsible_id: str
    starts_on: date
    ends_on: date
    completed_at: datetime | None
    revision: int
    created_at: datetime


class EvidenceOut(Output):
    id: str
    cycle_id: str
    activity_id: str
    title: str
    description: str
    kind: str
    url: str
    created_by: str
    created_at: datetime


class DiagnosticOut(Output):
    id: str
    cycle_id: str
    canvas_id: str
    entrepreneurship_id: str
    assessed_on: date
    assessments: list[Assessment]
    supersedes_id: str | None
    status: Status
    revision: int
    created_by: str
    created_at: datetime


class ValidationOut(Output):
    id: str
    cycle_id: str
    objective_id: str | None
    diagnostic_id: str | None
    actor_id: str
    decision: str
    observation: str
    entity_revision: int
    snapshot: dict[str, object]
    created_at: datetime


class ScheduleItem(ActivityOut):
    area_id: str
    deliverable: str | None


class ComparisonArea(Output):
    area_id: str
    before: str
    after: str


class DiagnosticComparison(Output):
    previous_id: str
    current_id: str
    canvas_id: str
    areas: list[ComparisonArea]
