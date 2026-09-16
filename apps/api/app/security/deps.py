from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Header, HTTPException
from jwt import PyJWTError
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.db.session import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.modules.identity.service import lock_invitation_email
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
    except (PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Token inválido") from exc
    clerk_user_id = claims.get("sub")
    if not isinstance(clerk_user_id, str) or not clerk_user_id or len(clerk_user_id) > 128:
        raise HTTPException(status_code=401, detail="Token sin identidad")
    if claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="Se requiere correo verificado")
    try:
        email = str(TypeAdapter(EmailStr).validate_python(claims.get("email"))).lower().strip()
    except ValidationError as exc:
        raise HTTPException(status_code=401, detail="Token sin correo válido") from exc
    result_user = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user: User | None = result_user.scalar_one_or_none()
    if user:
        return user
    await lock_invitation_email(db, email)
    result_email = await db.execute(select(User).where(func.lower(User.email) == email))
    existing: User | None = result_email.scalar_one_or_none()
    if existing:
        if existing.clerk_user_id == clerk_user_id:
            return existing
        raise HTTPException(
            status_code=403, detail="Identidad ya vinculada; requiere revisión administrativa"
        )
    now = datetime.now(UTC)
    result_inv = await db.execute(
        select(Invitation)
        .where(
            func.lower(Invitation.email) == email,
            Invitation.used_at.is_(None),
            Invitation.expires_at > now,
        )
        .with_for_update()
    )
    invitations = list(result_inv.scalars())
    if len(invitations) != 1:
        raise HTTPException(status_code=403, detail="Se requiere invitación vigente")
    invitation = invitations[0]
    if invitation.role not in {"Coordinadora", "Gestor", "Emprendedor"}:
        raise HTTPException(status_code=403, detail="Rol de invitación no autorizado")
    consumed = await db.scalar(
        update(Invitation)
        .where(
            Invitation.id == invitation.id,
            Invitation.used_at.is_(None),
            Invitation.expires_at > now,
        )
        .values(used_at=now)
        .returning(Invitation.id)
        .execution_options(synchronize_session="fetch")
    )
    if consumed is None:
        raise HTTPException(status_code=409, detail="Invitación ya utilizada")
    user_new = User(clerk_user_id=clerk_user_id, email=email, role=invitation.role)
    db.add(user_new)
    try:
        await db.flush()
        await write_audit(
            db,
            user_new.id,
            "invitation.accepted",
            "Invitation",
            invitation.id,
            before={"used_at": None},
            after={"used_at": now.isoformat(), "user_id": user_new.id},
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Identidad ya registrada") from exc
    await db.refresh(user_new)
    return user_new


async def require_role(
    allowed: set[str],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role not in allowed:
        raise HTTPException(status_code=403, detail="No autorizado para esta acción")
    return user
