from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field, WithJsonSchema


def _canonical_uuid(value: str) -> str:
    return str(UUID(value))


UUIDString = Annotated[
    str, AfterValidator(_canonical_uuid), WithJsonSchema({"type": "string", "format": "uuid"})
]


class EntrepreneurshipCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=200)


class EntrepreneurshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_at: datetime
    updated_at: datetime


class ProgramEnrollmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    program: Literal["Prototipado", "Puesta en marcha"]
    enrolled_at: AwareDatetime


class ProgramEnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entrepreneurship_id: str
    program: str
    enrolled_at: datetime


class ProgramCycleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=200)


class ProgramCycleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    enrollment_id: str
    name: str
    created_at: datetime


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_id: UUID
    role: Literal["Gestor", "Emprendedor"]


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    role: str
    created_at: datetime
    revoked_at: datetime | None
