from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class Editable(Record):
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Meeting(Editable, Base):
    __tablename__ = "meetings"
    cycle_id: Mapped[str] = mapped_column(String(36), ForeignKey("program_cycles.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    participants: Mapped[list[str]] = mapped_column(JSON)
    reference_url: Mapped[str | None] = mapped_column(Text)


class Minutes(Editable, Base):
    __tablename__ = "meeting_minutes"
    __table_args__ = (
        CheckConstraint("origin IN ('manual', 'ia_borrador')", name="ck_minutes_origin"),
        CheckConstraint("status IN ('borrador', 'aprobada')", name="ck_minutes_status"),
        CheckConstraint(
            "status != 'aprobada' OR (reviewed_by IS NOT NULL AND approved_at IS NOT NULL AND revoked_at IS NULL)",
            name="ck_minutes_review",
        ),
        CheckConstraint(
            "origin != 'ia_borrador' OR source_transcript IS NOT NULL", name="ck_minutes_source"
        ),
    )
    meeting_id: Mapped[str] = mapped_column(String(36), ForeignKey("meetings.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    origin: Mapped[str] = mapped_column(String(20))
    source_transcript: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="borrador")
    reviewed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Agreement(Editable, Base):
    __tablename__ = "agreements"
    meeting_id: Mapped[str] = mapped_column(String(36), ForeignKey("meetings.id"), index=True)
    description: Mapped[str] = mapped_column(Text)
    responsible_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    due_date: Mapped[date] = mapped_column(Date)
    next_steps: Mapped[str] = mapped_column(Text)


class Channel(Editable, Base):
    __tablename__ = "channels"
    entrepreneurship_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entrepreneurships.id"), index=True
    )
    cycle_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("program_cycles.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))


class Message(Editable, Base):
    __tablename__ = "channel_messages"
    __table_args__ = (UniqueConstraint("id", "channel_id", name="uq_message_channel"),)
    channel_id: Mapped[str] = mapped_column(String(36), ForeignKey("channels.id"), index=True)
    content: Mapped[str] = mapped_column(Text)


class Mention(Record, Base):
    __tablename__ = "chat_mentions"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_mention_user"),)
    message_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("channel_messages.id"), index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)


class ReadReceipt(Record, Base):
    __tablename__ = "chat_read_receipts"
    __table_args__ = (
        UniqueConstraint("channel_id", "user_id", name="uq_receipt_user"),
        ForeignKeyConstraint(
            ["last_read_message_id", "channel_id"],
            ["channel_messages.id", "channel_messages.channel_id"],
            name="fk_receipt_message_channel",
        ),
    )
    channel_id: Mapped[str] = mapped_column(String(36), ForeignKey("channels.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    last_read_message_id: Mapped[str] = mapped_column(String(36))
    read_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class Alert(Record, Base):
    __tablename__ = "alerts"
    entrepreneurship_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("entrepreneurships.id"), index=True
    )
    cycle_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("program_cycles.id"), index=True
    )
    recipient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    detail: Mapped[str] = mapped_column(Text)
    source_key: Mapped[str] = mapped_column(String(200), unique=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(Record, Base):
    __tablename__ = "notifications"
    # Recipient and scope are inherited from the alert, never independently writable.
    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.id"), unique=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
