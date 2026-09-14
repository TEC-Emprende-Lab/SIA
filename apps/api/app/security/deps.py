from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.security.clerk import verify_clerk_token


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autenticado")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        claims = verify_clerk_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token inválido") from exc
    clerk_user_id = str(claims.get("sub", ""))
    email = str(claims.get("email", "")).lower().strip()
    if not clerk_user_id or not email:
        raise HTTPException(status_code=401, detail="Token sin identidad")
    result_user = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user: User | None = result_user.scalar_one_or_none()
    if user:
        return user
    result_email = await db.execute(select(User).where(User.email == email))
    existing: User | None = result_email.scalar_one_or_none()
    if existing:
        existing.clerk_user_id = clerk_user_id
        await db.commit()
        await db.refresh(existing)
        return existing
    result_inv = await db.execute(
        select(Invitation).where(Invitation.email == email, Invitation.used_at.is_(None))
    )
    invitation: Invitation | None = result_inv.scalar_one_or_none()
    if invitation is None:
        count_result = await db.execute(select(User))
        if not count_result.scalars().first():
            bootstrap = User(clerk_user_id=clerk_user_id, email=email, role="Coordinadora")
            db.add(bootstrap)
            await db.commit()
            await db.refresh(bootstrap)
            return bootstrap
        raise HTTPException(status_code=403, detail="Se requiere invitación vigente")
    now = datetime.now(UTC)
    expires = invitation.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < now:
        raise HTTPException(status_code=403, detail="Invitación expirada")
    user_new = User(clerk_user_id=clerk_user_id, email=email, role=invitation.role)
    db.add(user_new)
    invitation.used_at = now
    await db.commit()
    await db.refresh(user_new)
    return user_new


async def require_role(
    allowed: set[str],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role not in allowed:
        raise HTTPException(status_code=403, detail="No autorizado para esta acción")
    return user
