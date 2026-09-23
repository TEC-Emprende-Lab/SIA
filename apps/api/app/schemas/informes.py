from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReportCreate(Input):
    period_start: date
    period_end: date
    kind: NonBlank = "mensual"
    narrative: str = ""

    @model_validator(mode="after")
    def _ordered(self) -> "ReportCreate":
        if self.period_start > self.period_end:
            raise ValueError("period_start no puede ser posterior a period_end")
        return self


class ReportUpdate(Input):
    expected_revision: int = Field(ge=1)
    observation: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    narrative: str = ""


class ReportApproval(Input):
    expected_revision: int = Field(ge=1)
    observation: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    human_reviewed: Literal[True]


class ReportCorrection(Input):
    observation: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    narrative: str | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    entrepreneurship_id: str
    cycle_id: str
    period_start: date
    period_end: date
    kind: str
    version: int
    status: Literal["borrador", "aprobado"]
    narrative: str
    composition: dict[str, Any]
    supersedes_id: str | None
    reviewed_by: str | None
    approved_at: datetime | None
    pdf_storage_key: str | None
    pdf_generated_at: datetime | None
    created_by: str
    revision: int
    created_at: datetime
