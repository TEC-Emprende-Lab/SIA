from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, StringConstraints

NonBlank = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CommunicationRevision(Input):
    expected_revision: int = Field(ge=1)
    observation: NonBlank


class MeetingCreate(Input):
    title: Title
    scheduled_at: AwareDatetime
    participants: list[NonBlank]
    reference_url: HttpUrl | None = None


class MeetingUpdate(MeetingCreate, CommunicationRevision):
    pass


class MinutesCreate(Input):
    content: NonBlank


class MinutesDraft(Input):
    transcript: NonBlank


class MinutesUpdate(MinutesCreate, CommunicationRevision):
    pass


class MinutesApproval(CommunicationRevision):
    human_reviewed: Literal[True]


class AgreementCreate(Input):
    description: NonBlank
    responsible_id: NonBlank
    due_date: date
    next_steps: str = ""


class AgreementUpdate(AgreementCreate, CommunicationRevision):
    pass


class ChannelCreate(Input):
    entrepreneurship_id: NonBlank
    cycle_id: NonBlank | None = None
    name: Title


class MessageCreate(Input):
    content: NonBlank
    mentioned_user_ids: list[NonBlank] = Field(default_factory=list)


class MessageUpdate(CommunicationRevision):
    content: NonBlank


class ReadReceiptCreate(Input):
    last_read_message_id: NonBlank


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class EditableOut(RecordOut):
    created_by: str
    revision: int
    revoked_at: datetime | None


class MeetingOut(EditableOut):
    cycle_id: str
    title: str
    scheduled_at: datetime
    participants: list[str]
    reference_url: str | None


class MinutesOut(EditableOut):
    meeting_id: str
    content: str
    origin: Literal["manual", "ia_borrador"]
    source_transcript: str | None
    status: Literal["borrador", "aprobada"]
    reviewed_by: str | None
    approved_at: datetime | None


class AgreementOut(EditableOut):
    meeting_id: str
    description: str
    responsible_id: str
    due_date: date
    next_steps: str


class ChannelOut(EditableOut):
    entrepreneurship_id: str
    cycle_id: str | None
    name: str


class MessageOut(EditableOut):
    channel_id: str
    content: str | None
    mentioned_user_ids: list[str]


class ReadReceiptOut(RecordOut):
    channel_id: str
    user_id: str
    last_read_message_id: str
    read_at: datetime


class UnreadOut(BaseModel):
    count: int


class AlertOut(RecordOut):
    entrepreneurship_id: str
    cycle_id: str | None
    recipient_id: str
    kind: str
    detail: str
    resolved_at: datetime | None


class NotificationOut(RecordOut):
    alert_id: str
    read_at: datetime | None
