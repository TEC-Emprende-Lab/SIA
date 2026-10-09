"""Archivo privado central. Decisión de diseño #6 en modelo-de-datos-detallado.md.

La clave de almacenamiento no sale en el contrato público: la API entrega una URL
firmada solo después de autorizar el emprendimiento.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import BigInteger, ForeignKey, String, event
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.seguimiento import Record


class Document(Record, Base):
    __tablename__ = "documents"

    entrepreneurship_id: Mapped[str] = mapped_column(
        ForeignKey("entrepreneurships.id"), nullable=False, index=True
    )
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    mime: Mapped[str] = mapped_column(String(255), nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)


def _immutable(_mapper: Any, _connection: Any, _target: Any) -> None:
    raise ValueError("El documento histórico es inmutable")


event.listen(Document, "before_update", _immutable)
event.listen(Document, "before_delete", _immutable)
