import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.core.config import settings
from app.models.invitation import Invitation
from app.models.user import User
from app.modules.identity.policy import ensure_can_invite


async def create_invitation(db: AsyncSession, actor: User, email: str, role: str) -> Invitation:
    ensure_can_invite(actor, role)
    email = email.lower().strip()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=settings.invitation_expires_days)
    invitation = Invitation(
        id=str(uuid4()),
        email=email,
        role=role,
        token=token,
        created_by=actor.id,
        expires_at=expires_at,
    )
    db.add(invitation)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "invitation.create",
        "Invitation",
        invitation.id,
        None,
        {"email": email, "role": role},
    )
    await db.commit()
    await db.refresh(invitation)
    return invitation


async def list_invitations(db: AsyncSession) -> list[Invitation]:
    result = await db.execute(select(Invitation).order_by(Invitation.created_at.desc()))
    return list(result.scalars().all())


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())
