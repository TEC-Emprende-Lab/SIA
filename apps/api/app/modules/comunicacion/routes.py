from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.comunicacion import Agreement, Channel, Meeting, Minutes, Notification, ReadReceipt
from app.models.user import User
from app.modules.comunicacion import service
from app.schemas import comunicacion as s
from app.security.deps import get_current_user

router = APIRouter(tags=["comunicacion"])
DB = Annotated[AsyncSession, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]


@router.get("/cycles/{cycle_id}/meetings", response_model=list[s.MeetingOut])
async def get_meetings(
    cycle_id: str, db: DB, user: Actor, offset: Offset = 0, limit: Limit = 50
) -> list[Meeting]:
    return await service.list_meetings(db, user, cycle_id, offset, limit)


@router.post("/cycles/{cycle_id}/meetings", response_model=s.MeetingOut, status_code=201)
async def create_meeting(cycle_id: str, db: DB, user: Actor, payload: s.MeetingCreate) -> Meeting:
    return await service.create_meeting(db, user, cycle_id, payload)


@router.get("/cycles/{cycle_id}/meetings/{meeting_id}", response_model=s.MeetingOut)
async def get_meeting(cycle_id: str, db: DB, user: Actor, meeting_id: str) -> Meeting:
    return await service.meeting(db, user, cycle_id, meeting_id)


@router.put("/cycles/{cycle_id}/meetings/{meeting_id}", response_model=s.MeetingOut)
async def update_meeting(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, payload: s.MeetingUpdate
) -> Meeting:
    return await service.update_meeting(db, user, cycle_id, meeting_id, payload)


@router.delete("/cycles/{cycle_id}/meetings/{meeting_id}", response_model=s.MeetingOut)
async def revoke_meeting(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, payload: s.CommunicationRevision
) -> Meeting:
    return await service.update_meeting(db, user, cycle_id, meeting_id, payload)


@router.get("/cycles/{cycle_id}/meetings/{meeting_id}/minutes", response_model=list[s.MinutesOut])
async def get_minutes(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, offset: Offset = 0, limit: Limit = 50
) -> list[Any]:
    return await service.list_children(db, user, cycle_id, meeting_id, Minutes, offset, limit)


@router.get(
    "/cycles/{cycle_id}/meetings/{meeting_id}/agreements", response_model=list[s.AgreementOut]
)
async def get_agreements(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, offset: Offset = 0, limit: Limit = 50
) -> list[Any]:
    return await service.list_children(db, user, cycle_id, meeting_id, Agreement, offset, limit)


@router.post(
    "/cycles/{cycle_id}/meetings/{meeting_id}/minutes", response_model=s.MinutesOut, status_code=201
)
async def create_minutes(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, payload: s.MinutesCreate
) -> Minutes:
    return await service.create_minutes(db, user, cycle_id, meeting_id, payload)


@router.post(
    "/cycles/{cycle_id}/meetings/{meeting_id}/minutes/drafts",
    response_model=s.MinutesOut,
    status_code=201,
)
async def draft_minutes(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, payload: s.MinutesDraft
) -> Minutes:
    return await service.create_minutes(db, user, cycle_id, meeting_id, payload)


@router.put(
    "/cycles/{cycle_id}/meetings/{meeting_id}/minutes/{minutes_id}", response_model=s.MinutesOut
)
async def update_minutes(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, minutes_id: str, payload: s.MinutesUpdate
) -> Minutes:
    return await service.update_minutes(db, user, cycle_id, meeting_id, minutes_id, payload)


@router.post(
    "/cycles/{cycle_id}/meetings/{meeting_id}/minutes/{minutes_id}/approval",
    response_model=s.MinutesOut,
)
async def approve_minutes(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, minutes_id: str, payload: s.MinutesApproval
) -> Minutes:
    return await service.update_minutes(db, user, cycle_id, meeting_id, minutes_id, payload)


@router.post(
    "/cycles/{cycle_id}/meetings/{meeting_id}/agreements",
    response_model=s.AgreementOut,
    status_code=201,
)
async def create_agreement(
    cycle_id: str, db: DB, user: Actor, meeting_id: str, payload: s.AgreementCreate
) -> Agreement:
    return await service.save_agreement(db, user, cycle_id, meeting_id, payload)


@router.put(
    "/cycles/{cycle_id}/meetings/{meeting_id}/agreements/{agreement_id}",
    response_model=s.AgreementOut,
)
async def update_agreement(
    cycle_id: str,
    db: DB,
    user: Actor,
    meeting_id: str,
    agreement_id: str,
    payload: s.AgreementUpdate,
) -> Agreement:
    return await service.save_agreement(db, user, cycle_id, meeting_id, payload, agreement_id)


@router.get("/channels", response_model=list[s.ChannelOut])
async def get_channels(
    entrepreneurship_id: str,
    db: DB,
    user: Actor,
    cycle_id: str | None = None,
    offset: Offset = 0,
    limit: Limit = 50,
) -> list[Channel]:
    return await service.list_channels(db, user, entrepreneurship_id, cycle_id, offset, limit)


@router.post("/channels", response_model=s.ChannelOut, status_code=201)
async def create_channel(payload: s.ChannelCreate, db: DB, user: Actor) -> Channel:
    return await service.create_channel(db, user, payload)


@router.get("/channels/{channel_id}/messages", response_model=list[s.MessageOut])
async def get_messages(
    channel_id: str, db: DB, user: Actor, offset: Offset = 0, limit: Limit = 50
) -> list[s.MessageOut]:
    return await service.list_messages(db, user, channel_id, offset, limit)


@router.post("/channels/{channel_id}/messages", response_model=s.MessageOut, status_code=201)
async def create_message(
    channel_id: str, db: DB, user: Actor, payload: s.MessageCreate
) -> s.MessageOut:
    return await service.create_message(db, user, channel_id, payload)


@router.put("/channels/{channel_id}/messages/{message_id}", response_model=s.MessageOut)
async def update_message(
    channel_id: str, db: DB, user: Actor, message_id: str, payload: s.MessageUpdate
) -> s.MessageOut:
    return await service.update_message(db, user, channel_id, message_id, payload)


@router.delete("/channels/{channel_id}/messages/{message_id}", response_model=s.MessageOut)
async def revoke_message(
    channel_id: str, db: DB, user: Actor, message_id: str, payload: s.CommunicationRevision
) -> s.MessageOut:
    return await service.update_message(db, user, channel_id, message_id, payload)


@router.put("/channels/{channel_id}/read-receipt", response_model=s.ReadReceiptOut)
async def mark_read(
    channel_id: str, db: DB, user: Actor, payload: s.ReadReceiptCreate
) -> ReadReceipt:
    return await service.mark_read(db, user, channel_id, payload)


@router.get("/channels/{channel_id}/unread", response_model=s.UnreadOut)
async def unread(channel_id: str, db: DB, user: Actor) -> s.UnreadOut:
    return await service.unread(db, user, channel_id)


@router.get("/alerts", response_model=list[s.AlertOut])
async def get_alerts(db: DB, user: Actor, offset: Offset = 0, limit: Limit = 50) -> list[Any]:
    return await service.inbox(db, user, False, offset, limit)


@router.get("/notifications", response_model=list[s.NotificationOut])
async def get_notifications(
    db: DB, user: Actor, offset: Offset = 0, limit: Limit = 50
) -> list[Any]:
    return await service.inbox(db, user, True, offset, limit)


@router.put("/notifications/{notification_id}/read", response_model=s.NotificationOut)
async def read_notification(notification_id: str, db: DB, user: Actor) -> Notification:
    return await service.read_notification(db, user, notification_id)
