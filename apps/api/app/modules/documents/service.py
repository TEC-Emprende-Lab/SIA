"""Carga y entrega de archivos privados. US-PRO-001/002 y US-PM-001/002.

Los límites de MIME y tamaño siguen TBD en objetivos-actividades-evidencias.md:
se registra lo que llega y no se inventa una lista permitida. Un archivo vacío
no es un documento.
"""

from pathlib import PurePath
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import write_audit
from app.core.config import settings
from app.models.document import Document
from app.models.expediente import Entrepreneurship
from app.models.user import User
from app.modules.expediente.policy import ensure_can_access_entrepreneurship
from app.schemas.document import DocumentAccessOut
from app.storage.store import ObjectStore, StorageNotConfigured


def object_key(entrepreneurship_id: str, document_id: str) -> str:
    return f"documents/{entrepreneurship_id}/{document_id}"


def display_name(filename: str | None) -> str:
    name = PurePath(filename or "").name.strip()
    if not name or name in {".", ".."}:
        raise HTTPException(status_code=422, detail="El archivo necesita un nombre")
    if len(name) > 200:
        raise HTTPException(status_code=422, detail="El nombre admite hasta 200 caracteres")
    return name


def recorded_mime(content_type: str | None) -> str:
    mime = (content_type or "application/octet-stream").split(";", 1)[0].strip()
    if not mime:
        mime = "application/octet-stream"
    return mime[:255]


async def create_document(
    db: AsyncSession,
    actor: User,
    entrepreneurship_id: str,
    *,
    filename: str | None,
    content_type: str | None,
    body: bytes,
    store: ObjectStore,
) -> Document:
    await ensure_can_access_entrepreneurship(db, actor, entrepreneurship_id)
    if await db.get(Entrepreneurship, entrepreneurship_id) is None:
        raise HTTPException(status_code=404, detail="Emprendimiento no encontrado")
    if not body:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    name = display_name(filename)
    mime = recorded_mime(content_type)
    document_id = str(uuid4())
    key = object_key(entrepreneurship_id, document_id)
    try:
        await store.put(key, body, mime)
    except StorageNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="Almacenamiento privado no configurado"
        ) from exc
    document = Document(
        id=document_id,
        entrepreneurship_id=entrepreneurship_id,
        storage_key=key,
        name=name,
        mime=mime,
        size=len(body),
        uploaded_by=actor.id,
    )
    db.add(document)
    await db.flush()
    await write_audit(
        db,
        actor.id,
        "document.created",
        "document",
        document.id,
        after={
            "entrepreneurship_id": entrepreneurship_id,
            "name": name,
            "mime": mime,
            "size": len(body),
            "storage_key": key,
        },
    )
    await db.commit()
    return document


async def issue_access(
    db: AsyncSession,
    actor: User,
    entrepreneurship_id: str,
    document_id: str,
    store: ObjectStore,
) -> DocumentAccessOut:
    await ensure_can_access_entrepreneurship(db, actor, entrepreneurship_id)
    document = await db.get(Document, document_id)
    if document is None or document.entrepreneurship_id != entrepreneurship_id:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    expires_in = settings.storage_signed_url_seconds
    try:
        url = await store.signed_get_url(document.storage_key, expires_seconds=expires_in)
    except StorageNotConfigured as exc:
        raise HTTPException(
            status_code=503, detail="Almacenamiento privado no configurado"
        ) from exc
    await write_audit(
        db,
        actor.id,
        "document.access",
        "document",
        document.id,
        after={"expires_in": expires_in},
    )
    await db.commit()
    return DocumentAccessOut(url=url, expires_in=expires_in)
