from fastapi import APIRouter, Depends, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import check_rate_limit
from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.modules.documents.service import create_document, issue_access
from app.schemas.document import DocumentAccessOut, DocumentOut
from app.schemas.expediente import UUIDString
from app.security.deps import get_current_user
from app.storage.store import ObjectStore, get_object_store

router = APIRouter(prefix="/entrepreneurships", tags=["documentos"])


@router.post(
    "/{entrepreneurship_id}/documents",
    response_model=DocumentOut,
    status_code=201,
)
async def post_document(
    entrepreneurship_id: UUIDString,
    request: Request,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    store: ObjectStore = Depends(get_object_store),
) -> Document:
    await check_rate_limit(request, key=user.id)
    body = await file.read()
    return await create_document(
        db,
        user,
        entrepreneurship_id,
        filename=file.filename,
        content_type=file.content_type,
        body=body,
        store=store,
    )


@router.get(
    "/{entrepreneurship_id}/documents/{document_id}/access",
    response_model=DocumentAccessOut,
)
async def get_document_access(
    entrepreneurship_id: UUIDString,
    document_id: UUIDString,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    store: ObjectStore = Depends(get_object_store),
) -> DocumentAccessOut:
    return await issue_access(db, user, entrepreneurship_id, document_id, store)
