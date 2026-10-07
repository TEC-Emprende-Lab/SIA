from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DocumentOut(BaseModel):
    """Metadatos del archivo. La clave de almacenamiento no se publica."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    entrepreneurship_id: str
    name: str
    mime: str
    size: int
    uploaded_by: str
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def utc_dates(cls, value: object) -> object:
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value


class DocumentAccessOut(BaseModel):
    url: str
    expires_in: int = Field(ge=1)
