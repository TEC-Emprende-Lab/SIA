from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.models.comunicacion import (
    Agreement,
    Alert,
    Channel,
    Meeting,
    Mention,
    Message,
    Minutes,
    Notification,
    ReadReceipt,
)
from app.models.user import User
from app.modules.comunicacion import policy
from app.modules.comunicacion.interfaces import MinutesGenerator, TranscriptDraftStub
from app.schemas import comunicacion as s

Entity = Meeting | Minutes | Agreement | Channel | Message | ReadReceipt | Alert | Notification


def snapshot(entity: Entity) -> dict[str, Any]:
    return {
        column.name: jsonable_encoder(getattr(entity, column.name))
        for column in entity.__table__.columns
    }


async def persist[
    T: (Meeting, Minutes, Agreement, Channel, Message, ReadReceipt, Alert, Notification)
](
    db: AsyncSession,
    actor: User,
    entity: T,
    action: str,
    *,
    before: dict[str, Any] | None = None,
    observation: str = "Registro creado",
) -> T:
    db.add(entity)
    try:
        await db.flush()
        await write_audit(
            db,
            actor.id,
            action,
            entity.__class__.__name__,
            entity.id,
            before=before,
            after={**snapshot(entity), "observation": observation},
        )
        await db.commit()
    except Exception:
        await db.rollback()
        raise
    return entity


async def fetch[
    T: (Meeting, Minutes, Agreement, Channel, Message, ReadReceipt, Alert, Notification)
](db: AsyncSession, model: type[T], entity_id: str, *, lock: bool = False) -> T:
    query = select(model).where(model.id == entity_id)
    if lock:
        query = query.with_for_update()
    entity = await db.scalar(query.execution_options(populate_existing=True))
    if entity is None:
        raise HTTPException(404, "Registro no encontrado")
    return entity


def check_revision(
    entity: Meeting | Minutes | Agreement | Channel | Message, revision: int
) -> None:
    if entity.revoked_at is not None:
        raise HTTPException(409, "Registro revocado")
    if entity.revision != revision:
        raise HTTPException(409, "Revisión obsoleta")
    if isinstance(entity, Minutes) and entity.status == "aprobada":
        raise HTTPException(409, "Minuta aprobada inmutable; crear otra minuta")


async def meeting(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    *,
    manage: bool = False,
    lock: bool = False,
) -> Meeting:
    await policy.cycle_scope(db, actor, cycle_id, manage=manage, lock=lock)
    item = await fetch(db, Meeting, meeting_id)
    if item.cycle_id != cycle_id:
        raise HTTPException(404, "Reunión ajena al ciclo")
    return item


async def list_meetings(
    db: AsyncSession, actor: User, cycle_id: str, offset: int, limit: int
) -> list[Meeting]:
    await policy.cycle_scope(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(Meeting)
            .where(Meeting.cycle_id == cycle_id)
            .order_by(Meeting.created_at, Meeting.id)
            .offset(offset)
            .limit(limit)
        )
    )


async def create_meeting(
    db: AsyncSession, actor: User, cycle_id: str, payload: s.MeetingCreate
) -> Meeting:
    await policy.cycle_scope(db, actor, cycle_id, manage=True, lock=True)
    return await persist(
        db,
        actor,
        Meeting(
            cycle_id=cycle_id,
            created_by=actor.id,
            **payload.model_dump(mode="python", exclude={"reference_url"}),
            reference_url=str(payload.reference_url) if payload.reference_url else None,
        ),
        "meeting.created",
    )


async def update_meeting(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    payload: s.MeetingUpdate | s.CommunicationRevision,
) -> Meeting:
    item = await meeting(db, actor, cycle_id, meeting_id, manage=True, lock=True)
    check_revision(item, payload.expected_revision)
    before = snapshot(item)
    if isinstance(payload, s.MeetingUpdate):
        for key, value in payload.model_dump(
            exclude={"expected_revision", "observation", "reference_url"}
        ).items():
            setattr(item, key, value)
        item.reference_url = str(payload.reference_url) if payload.reference_url else None
    else:
        item.revoked_at = datetime.now(UTC)
    item.revision += 1
    return await persist(
        db, actor, item, "meeting.updated", before=before, observation=payload.observation
    )


async def list_children(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    model: type[Minutes] | type[Agreement],
    offset: int,
    limit: int,
) -> list[Any]:
    await meeting(db, actor, cycle_id, meeting_id)
    query = select(model).where(model.meeting_id == meeting_id)
    if model is Minutes and actor.role == "Emprendedor":
        query = query.where(Minutes.status == "aprobada")
    return list(
        await db.scalars(query.order_by(model.created_at, model.id).offset(offset).limit(limit))
    )


async def create_minutes(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    payload: s.MinutesCreate | s.MinutesDraft,
    generator: MinutesGenerator | None = None,
) -> Minutes:
    parent = await meeting(db, actor, cycle_id, meeting_id, manage=True, lock=True)
    if parent.revoked_at:
        raise HTTPException(409, "Reunión revocada")
    if isinstance(payload, s.MinutesDraft):
        transcript = payload.transcript
        content = await (generator or TranscriptDraftStub()).draft(transcript)
    else:
        transcript = None
        content = payload.content
    return await persist(
        db,
        actor,
        Minutes(
            meeting_id=meeting_id,
            created_by=actor.id,
            content=content,
            origin="ia_borrador" if transcript is not None else "manual",
            source_transcript=transcript,
        ),
        "minutes.created",
    )


async def update_minutes(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    minutes_id: str,
    payload: s.MinutesUpdate | s.MinutesApproval,
) -> Minutes:
    parent = await meeting(db, actor, cycle_id, meeting_id, manage=True, lock=True)
    if parent.revoked_at:
        raise HTTPException(409, "Reunión revocada")
    item = await fetch(db, Minutes, minutes_id)
    if item.meeting_id != meeting_id:
        raise HTTPException(404, "Minuta ajena a la reunión")
    check_revision(item, payload.expected_revision)
    before = snapshot(item)
    if isinstance(payload, s.MinutesApproval):
        item.status = "aprobada"
        item.reviewed_by = actor.id
        item.approved_at = datetime.now(UTC)
    else:
        item.content = payload.content
    item.revision += 1
    return await persist(
        db,
        actor,
        item,
        "minutes.approved" if isinstance(payload, s.MinutesApproval) else "minutes.updated",
        before=before,
        observation=payload.observation,
    )


async def save_agreement(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    meeting_id: str,
    payload: s.AgreementCreate | s.AgreementUpdate,
    agreement_id: str | None = None,
) -> Agreement:
    parent = await meeting(db, actor, cycle_id, meeting_id, manage=True, lock=True)
    if parent.revoked_at:
        raise HTTPException(409, "Reunión revocada")
    eid = await policy.cycle_scope(db, actor, cycle_id)
    before = None
    observation = "Acuerdo registrado"
    if agreement_id is not None and isinstance(payload, s.AgreementUpdate):
        item = await fetch(db, Agreement, agreement_id)
        if item.meeting_id != meeting_id:
            raise HTTPException(404, "Acuerdo ajeno a la reunión")
        check_revision(item, payload.expected_revision)
        before = snapshot(item)
        item.revision += 1
        observation = payload.observation
    else:
        item = Agreement(meeting_id=meeting_id, created_by=actor.id)
    await policy.recipient(db, payload.responsible_id, eid, cycle_id)
    for key, value in payload.model_dump(exclude={"expected_revision", "observation"}).items():
        setattr(item, key, value)
    return await persist(db, actor, item, "agreement.saved", before=before, observation=observation)


async def channel(db: AsyncSession, actor: User, channel_id: str, *, lock: bool = False) -> Channel:
    item = await fetch(db, Channel, channel_id, lock=lock)
    await policy.scope(db, actor, item.entrepreneurship_id, item.cycle_id)
    return item


async def list_channels(
    db: AsyncSession,
    actor: User,
    entrepreneurship_id: str,
    cycle_id: str | None,
    offset: int,
    limit: int,
) -> list[Channel]:
    await policy.scope(db, actor, entrepreneurship_id, cycle_id)
    return list(
        await db.scalars(
            select(Channel)
            .where(Channel.entrepreneurship_id == entrepreneurship_id, Channel.cycle_id == cycle_id)
            .order_by(Channel.created_at, Channel.id)
            .offset(offset)
            .limit(limit)
        )
    )


async def create_channel(db: AsyncSession, actor: User, payload: s.ChannelCreate) -> Channel:
    await policy.scope(db, actor, payload.entrepreneurship_id, payload.cycle_id, manage=True)
    return await persist(
        db, actor, Channel(created_by=actor.id, **payload.model_dump()), "channel.created"
    )


async def message_out(db: AsyncSession, item: Message) -> s.MessageOut:
    mentions = list(
        await db.scalars(
            select(Mention.user_id).where(Mention.message_id == item.id).order_by(Mention.user_id)
        )
    )
    return s.MessageOut(
        **{
            **snapshot(item),
            "content": None if item.revoked_at else item.content,
            "mentioned_user_ids": mentions if not item.revoked_at else [],
        }
    )


async def list_messages(
    db: AsyncSession, actor: User, channel_id: str, offset: int, limit: int
) -> list[s.MessageOut]:
    await channel(db, actor, channel_id)
    items = await db.scalars(
        select(Message)
        .where(Message.channel_id == channel_id)
        .order_by(Message.created_at, Message.id)
        .offset(offset)
        .limit(limit)
    )
    return [await message_out(db, item) for item in items]


async def emit_alert(
    db: AsyncSession,
    actor: User,
    entrepreneurship_id: str,
    cycle_id: str | None,
    recipient_id: str,
    kind: str,
    detail: str,
    source_key: str,
) -> Alert:
    """Internal ingestion, no commit: caller supplies an authorized business event.

    No scheduler/escalation/closure policy is inferred here.
    """
    await policy.scope(db, actor, entrepreneurship_id, cycle_id)
    await policy.recipient(db, recipient_id, entrepreneurship_id, cycle_id)
    # Serialize event ingestion per recipient; retrying a source key produces
    # one alert/notification even across worker sessions.
    await db.scalar(select(User).where(User.id == recipient_id).with_for_update())
    existing = await db.scalar(select(Alert).where(Alert.source_key == source_key))
    if existing:
        if (existing.entrepreneurship_id, existing.cycle_id, existing.recipient_id) != (
            entrepreneurship_id,
            cycle_id,
            recipient_id,
        ):
            raise HTTPException(409, "Clave de evento de otro ámbito")
        return existing
    alert = Alert(
        entrepreneurship_id=entrepreneurship_id,
        cycle_id=cycle_id,
        recipient_id=recipient_id,
        kind=kind,
        detail=detail,
        source_key=source_key,
    )
    db.add(alert)
    await db.flush()
    notification = Notification(alert_id=alert.id)
    db.add(notification)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "alert.created",
        "Alert",
        alert.id,
        after={**snapshot(alert), "observation": "Evento autorizado"},
    )
    await write_audit(
        db,
        actor.id,
        "notification.created",
        "Notification",
        notification.id,
        after={**snapshot(notification), "observation": "Notificación interna"},
    )
    return alert


async def create_message(
    db: AsyncSession, actor: User, channel_id: str, payload: s.MessageCreate
) -> s.MessageOut:
    parent = await channel(db, actor, channel_id, lock=True)
    if parent.revoked_at:
        raise HTTPException(409, "Canal revocado")
    users = sorted(set(payload.mentioned_user_ids))
    for user_id in users:
        await policy.recipient(db, user_id, parent.entrepreneurship_id, parent.cycle_id)
    try:
        item = Message(channel_id=channel_id, created_by=actor.id, content=payload.content)
        db.add(item)
        await db.flush()
        for user_id in users:
            db.add(Mention(message_id=item.id, user_id=user_id))
            await emit_alert(
                db,
                actor,
                parent.entrepreneurship_id,
                parent.cycle_id,
                user_id,
                "mention",
                f"Mención en canal {parent.name}",
                f"mention:{item.id}:{user_id}",
            )
        await persist(db, actor, item, "message.created")
    except Exception:
        await db.rollback()
        raise
    return await message_out(db, item)


async def update_message(
    db: AsyncSession,
    actor: User,
    channel_id: str,
    message_id: str,
    payload: s.MessageUpdate | s.CommunicationRevision,
) -> s.MessageOut:
    parent = await channel(db, actor, channel_id, lock=True)
    if parent.revoked_at:
        raise HTTPException(409, "Canal revocado")
    item = await fetch(db, Message, message_id)
    if item.channel_id != channel_id:
        raise HTTPException(404, "Mensaje ajeno al canal")
    if item.created_by != actor.id:
        raise HTTPException(403, "Solo el autor puede modificar su mensaje")
    check_revision(item, payload.expected_revision)
    before = snapshot(item)
    if isinstance(payload, s.MessageUpdate):
        item.content = payload.content
    else:
        item.revoked_at = datetime.now(UTC)
    item.revision += 1
    await persist(
        db,
        actor,
        item,
        "message.updated" if isinstance(payload, s.MessageUpdate) else "message.revoked",
        before=before,
        observation=payload.observation,
    )
    return await message_out(db, item)


async def mark_read(
    db: AsyncSession, actor: User, channel_id: str, payload: s.ReadReceiptCreate
) -> ReadReceipt:
    await channel(db, actor, channel_id, lock=True)
    message = await fetch(db, Message, payload.last_read_message_id)
    if message.channel_id != channel_id:
        raise HTTPException(404, "Mensaje ajeno al canal")
    receipt = await db.scalar(
        select(ReadReceipt).where(
            ReadReceipt.channel_id == channel_id, ReadReceipt.user_id == actor.id
        )
    )
    before = snapshot(receipt) if receipt else None
    if receipt:
        previous = await fetch(db, Message, receipt.last_read_message_id)
        if (previous.created_at, previous.id) >= (message.created_at, message.id):
            return receipt
        receipt.last_read_message_id = message.id
        receipt.read_at = datetime.now(UTC)
    else:
        receipt = ReadReceipt(
            channel_id=channel_id, user_id=actor.id, last_read_message_id=message.id
        )
    return await persist(
        db, actor, receipt, "channel.read", before=before, observation="Lectura propia"
    )


async def unread(db: AsyncSession, actor: User, channel_id: str) -> s.UnreadOut:
    await channel(db, actor, channel_id)
    query = (
        select(func.count())
        .select_from(Message)
        .where(
            Message.channel_id == channel_id,
            Message.created_by != actor.id,
            Message.revoked_at.is_(None),
        )
    )
    receipt = await db.scalar(
        select(ReadReceipt).where(
            ReadReceipt.channel_id == channel_id, ReadReceipt.user_id == actor.id
        )
    )
    if receipt:
        last = await fetch(db, Message, receipt.last_read_message_id)
        query = query.where(
            or_(
                Message.created_at > last.created_at,
                and_(Message.created_at == last.created_at, Message.id > last.id),
            )
        )
    return s.UnreadOut(count=await db.scalar(query) or 0)


async def inbox(
    db: AsyncSession, actor: User, notifications: bool, offset: int, limit: int
) -> list[Any]:
    # Filter authorization BEFORE pagination, including revocations. No global
    # coordinator override for another recipient's personal inbox.
    from sqlalchemy import exists

    from app.models.expediente import EntrepreneurshipAssignment, ProgramCycleAssignment

    direct = exists().where(
        EntrepreneurshipAssignment.entrepreneurship_id == Alert.entrepreneurship_id,
        EntrepreneurshipAssignment.user_id == actor.id,
        EntrepreneurshipAssignment.role == actor.role,
        EntrepreneurshipAssignment.revoked_at.is_(None),
    )
    scoped = exists().where(
        ProgramCycleAssignment.program_cycle_id == Alert.cycle_id,
        ProgramCycleAssignment.user_id == actor.id,
        ProgramCycleAssignment.role == actor.role,
        ProgramCycleAssignment.revoked_at.is_(None),
    )
    query = (
        select(Notification).join(Alert, Notification.alert_id == Alert.id)
        if notifications
        else select(Alert)
    )
    query = query.where(Alert.recipient_id == actor.id)
    if actor.role != "Coordinadora":
        query = query.where(direct | scoped)
    return list(
        await db.scalars(query.order_by(Alert.created_at, Alert.id).offset(offset).limit(limit))
    )


async def read_notification(db: AsyncSession, actor: User, notification_id: str) -> Notification:
    item = await fetch(db, Notification, notification_id, lock=True)
    alert = await fetch(db, Alert, item.alert_id)
    if alert.recipient_id != actor.id:
        raise HTTPException(404, "Notificación no encontrada")
    await policy.scope(db, actor, alert.entrepreneurship_id, alert.cycle_id)
    if item.read_at:
        return item
    before = snapshot(item)
    item.read_at = datetime.now(UTC)
    return await persist(
        db, actor, item, "notification.read", before=before, observation="Lectura propia"
    )
