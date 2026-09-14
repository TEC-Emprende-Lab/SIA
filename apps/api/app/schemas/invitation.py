from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: str
    token: str
    expires_at: datetime
    used_at: datetime | None
    created_at: datetime
