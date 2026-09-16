import argparse
import asyncio
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.core.config import settings
from app.models.invitation import Invitation
from app.models.user import User
from app.modules.identity.policy import ensure_can_invite, ensure_can_list_invitations


async def lock_invitation_email(db: AsyncSession, email: str) -> None:
    """Serialize issuing and accepting invitations, including absent rows, in PostgreSQL."""
    if db.get_bind().dialect.name == "postgresql":
        await db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:email, 0))"), {"email": email}
        )


async def ensure_invitable_email(db: AsyncSession, email: str) -> None:
    await lock_invitation_email(db, email)
    if await db.scalar(select(User.id).where(func.lower(User.email) == email).limit(1)):
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    pending = await db.scalar(
        select(Invitation.id)
        .where(
            func.lower(Invitation.email) == email,
            Invitation.used_at.is_(None),
            Invitation.expires_at > datetime.now(UTC),
        )
        .limit(1)
    )
    if pending:
        raise HTTPException(status_code=409, detail="Ya existe una invitación vigente")


async def create_invitation(db: AsyncSession, actor: User, email: str, role: str) -> Invitation:
    ensure_can_invite(actor, role)
    email = str(TypeAdapter(EmailStr).validate_python(email)).lower().strip()
    await ensure_invitable_email(db, email)
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


async def list_invitations(
    db: AsyncSession, actor: User, limit: int = 50, offset: int = 0
) -> list[Invitation]:
    ensure_can_list_invitations(actor)
    query = select(Invitation)
    if actor.role != "Coordinadora":
        query = query.where(Invitation.created_by == actor.id)
    result = await db.execute(
        query.order_by(Invitation.created_at.desc(), Invitation.id).limit(limit).offset(offset)
    )
    return list(result.scalars().all())


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())


async def bootstrap_invitation(db: AsyncSession, email: str, operator: str) -> Invitation:
    """Administrative CLI only: issue the first invitation, never create an authenticated user."""
    if not operator.strip():
        raise ValueError("An administrative operator identifier is required")
    email = str(TypeAdapter(EmailStr).validate_python(email)).lower().strip()
    if db.get_bind().dialect.name == "postgresql":
        await db.execute(text("LOCK TABLE users, invitations IN SHARE ROW EXCLUSIVE MODE"))
    if await db.scalar(select(User.id).limit(1)):
        raise ValueError("Bootstrap requires an empty user registry")
    if await db.scalar(
        select(Invitation.id)
        .where(Invitation.used_at.is_(None), Invitation.expires_at > datetime.now(UTC))
        .limit(1)
    ):
        raise ValueError("A pending invitation already exists")
    invitation = Invitation(
        email=email,
        role="Coordinadora",
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(UTC) + timedelta(days=settings.invitation_expires_days),
    )
    db.add(invitation)
    await db.flush()
    await write_audit(
        db,
        None,
        "invitation.bootstrap",
        "Invitation",
        invitation.id,
        after={"email": email, "role": "Coordinadora", "operator": operator.strip()},
    )
    await db.commit()
    await db.refresh(invitation)
    return invitation


def main() -> None:
    parser = argparse.ArgumentParser(description="Emitir la primera invitación administrativa SIA")
    parser.add_argument("--email", required=True)
    parser.add_argument(
        "--operator", required=True, help="Identificador del administrador que ejecuta el comando"
    )
    args = parser.parse_args()

    async def run() -> None:
        from app.db.session import async_session

        async with async_session() as db:
            invitation = await bootstrap_invitation(db, args.email, args.operator)
            print(
                f"Invitación {invitation.id} emitida para {invitation.email}; vence {invitation.expires_at}"
            )

    try:
        asyncio.run(run())
    except ValueError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
