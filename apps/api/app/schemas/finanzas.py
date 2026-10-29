from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Money = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]
Kind = Literal["factura", "reintegro", "uso_tc", "comision_bancaria", "pago_contrato"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ItemCreate(Input):
    name: Name
    amount: Money
    observation: Text


class PurchaseFields(Input):
    item_id: str = Field(min_length=1, max_length=36)
    kind: Kind
    amount: Money
    supplier: Name
    invoice_number: str = Field(default="", max_length=100)
    description: Text
    submission_date: date | None = None
    checklist: dict[str, bool] = Field(default_factory=dict, max_length=20)


class PurchaseCreate(PurchaseFields):
    request_key: str = Field(min_length=1, max_length=100)


class PurchaseUpdate(PurchaseFields):
    expected_revision: int = Field(ge=1)
    observation: Text


class Transition(Input):
    expected_revision: int = Field(ge=1)
    action: Literal[
        "submit",
        "request_correction",
        "validate",
        "register_fundatec",
        "execute",
        "reject",
        "cancel",
    ]
    observation: Text
    human_reviewed: bool = False
    fundatec_number: str = Field(default="", max_length=100)
    executed_on: date | None = None


class AttachmentCreate(Input):
    document_id: str = Field(min_length=1, max_length=36)
    expected_revision: int = Field(ge=1)


class ChangeCreate(Input):
    source_id: str = Field(min_length=1, max_length=36)
    target_id: str = Field(min_length=1, max_length=36)
    amount: Money
    reason: Text


class ChangeDecision(Input):
    expected_revision: int = Field(ge=1)
    decision: Literal["approve", "reject"]
    observation: Text
    human_reviewed: Literal[True]


class ReconcileCreate(Input):
    name: Name
    html: str = Field(min_length=1, max_length=2_000_000)
    confirm_cycle: Literal[True]


class Resolution(Input):
    row_key: str = Field(min_length=1, max_length=100)
    observation: Text


class Extraction(Input):
    name: Name
    content_base64: str = Field(min_length=1, max_length=8_000_000)


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    amount: Decimal
    revision: int


class PurchaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cycle_id: str
    item_id: str
    kind: Kind
    status: str
    amount: Decimal
    supplier: str
    invoice_number: str
    description: str
    submission_date: date | None
    executed_on: date | None
    fundatec_number: str
    checklist: dict[str, bool]
    checklist_version: int
    revision: int
    created_by: str
    created_at: datetime


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    entity_id: str
    action: str
    observation: str
    snapshot: dict[str, Any]
    actor_id: str
    created_at: datetime


class AttachmentOut(BaseModel):
    id: str
    document_id: str
    name: str


class ChangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_id: str
    target_id: str
    amount: Decimal
    reason: str
    status: str
    revision: int
    created_by: str


class ReconciliationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    sha256: str
    project_reference: str
    results: list[dict[str, Any]]
    created_at: datetime
