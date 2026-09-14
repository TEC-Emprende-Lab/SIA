from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import check_rate_limit
from app.db.session import get_db
from app.models.invitation import Invitation
from app.models.user import User
from app.modules.identity.policy import ensure_can_list_invitations, ensure_can_list_users
from app.modules.identity.service import create_invitation, list_invitations, list_users
from app.schemas.invitation import InvitationCreate, InvitationOut
from app.schemas.user import MeOut, UserOut
from app.security.deps import get_current_user

router = APIRouter(tags=["identity"])


@router.get("/users/me", response_model=MeOut)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/users", response_model=list[UserOut])
async def get_users(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[User]:
    ensure_can_list_users(user)
    return await list_users(db)


@router.post("/invitations", response_model=InvitationOut, status_code=201)
async def post_invitation(
    payload: InvitationCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Invitation:
    await check_rate_limit(request, key=user.id)
    return await create_invitation(db, user, str(payload.email), payload.role)


@router.get("/invitations", response_model=list[InvitationOut])
async def get_invitations(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[Invitation]:
    ensure_can_list_invitations(user)
    return await list_invitations(db)
