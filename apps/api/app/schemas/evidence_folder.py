from pydantic import BaseModel, ConfigDict, Field

from app.schemas.seguimiento import Input, Title


class FolderCreate(Input):
    name: Title


class FolderUpdate(FolderCreate):
    expected_revision: int = Field(ge=1)


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cycle_id: str
    name: str
    revision: int


class PlacementUpdate(Input):
    folder_id: str | None = None
    expected_revision: int = Field(ge=0)


class PlacementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    evidence_id: str
    cycle_id: str
    folder_id: str | None
    revision: int
