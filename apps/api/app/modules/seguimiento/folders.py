"""US-PRO-001 / US-PM-001: folders never mutate evidence or validation snapshots."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence_folder import EvidenceFolder, EvidencePlacement
from app.models.seguimiento import Evidence
from app.models.user import User
from app.modules.seguimiento.policy import authorize_cycle
from app.modules.seguimiento.service import audit, snapshot, transaction
from app.schemas.evidence_folder import FolderCreate, FolderUpdate, PlacementUpdate


async def list_folders(db: AsyncSession, actor: User, cycle_id: str) -> list[EvidenceFolder]:
    await authorize_cycle(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(EvidenceFolder)
            .where(EvidenceFolder.cycle_id == cycle_id)
            .order_by(EvidenceFolder.created_at, EvidenceFolder.id)
        )
    )


async def save_folder(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    payload: FolderCreate | FolderUpdate,
    folder_id: str | None = None,
) -> EvidenceFolder:
    async with transaction(db):
        await authorize_cycle(db, actor, cycle_id, lock=True)
        before = None
        if folder_id:
            folder = await db.get(EvidenceFolder, folder_id)
            if folder is None or folder.cycle_id != cycle_id:
                raise HTTPException(404, "Carpeta no encontrada")
            if (
                not isinstance(payload, FolderUpdate)
                or folder.revision != payload.expected_revision
            ):
                raise HTTPException(409, "La carpeta cambió; vuelve a consultar")
            before = snapshot(folder)
            folder.name = payload.name
            folder.revision += 1
        else:
            folder = EvidenceFolder(cycle_id=cycle_id, name=payload.name, created_by=actor.id)
            db.add(folder)
        await audit(db, actor, folder, "folder.saved", before)
    return folder


async def list_placements(db: AsyncSession, actor: User, cycle_id: str) -> list[EvidencePlacement]:
    await authorize_cycle(db, actor, cycle_id)
    return list(
        await db.scalars(
            select(EvidencePlacement)
            .where(EvidencePlacement.cycle_id == cycle_id)
            .order_by(EvidencePlacement.evidence_id)
        )
    )


async def move_evidence(
    db: AsyncSession,
    actor: User,
    cycle_id: str,
    evidence_id: str,
    payload: PlacementUpdate,
) -> EvidencePlacement:
    async with transaction(db):
        await authorize_cycle(db, actor, cycle_id, lock=True)
        evidence = await db.get(Evidence, evidence_id)
        if evidence is None or evidence.cycle_id != cycle_id:
            raise HTTPException(404, "Evidencia no encontrada")
        if payload.folder_id:
            folder = await db.get(EvidenceFolder, payload.folder_id)
            if folder is None or folder.cycle_id != cycle_id:
                raise HTTPException(404, "Carpeta no encontrada en este ciclo")
        placement = await db.get(EvidencePlacement, evidence_id)
        if (placement.revision if placement else 0) != payload.expected_revision:
            raise HTTPException(409, "La ubicación cambió; vuelve a consultar")
        before = snapshot(placement) if placement else None
        if placement is None:
            placement = EvidencePlacement(
                evidence_id=evidence_id, cycle_id=cycle_id, folder_id=payload.folder_id
            )
            db.add(placement)
        else:
            placement.folder_id = payload.folder_id
            placement.revision += 1
        await audit(db, actor, placement, "evidence.moved", before)
    return placement
