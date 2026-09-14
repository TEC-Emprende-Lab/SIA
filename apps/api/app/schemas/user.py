from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    clerk_user_id: str | None
    email: str
    role: str
    created_at: datetime


class MeOut(UserOut):
    pass
