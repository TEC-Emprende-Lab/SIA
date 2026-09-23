from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.informes import TechnicalReport
from app.models.user import User
from app.modules.informes import service
from app.schemas import informes as s
from app.security.deps import get_current_user

router = APIRouter(tags=["informes"])
DB = Annotated[AsyncSession, Depends(get_db)]
Actor = Annotated[User, Depends(get_current_user)]
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]


@router.get("/cycles/{cycle_id}/reports", response_model=list[s.ReportOut])
async def list_reports(
    cycle_id: str, db: DB, user: Actor, offset: Offset = 0, limit: Limit = 50
) -> list[TechnicalReport]:
    return await service.list_reports(db, user, cycle_id, offset, limit)


@router.post("/cycles/{cycle_id}/reports", response_model=s.ReportOut, status_code=201)
async def create_report(
    cycle_id: str, db: DB, user: Actor, payload: s.ReportCreate
) -> TechnicalReport:
    return await service.create_report(db, user, cycle_id, payload)


@router.get("/cycles/{cycle_id}/reports/{report_id}", response_model=s.ReportOut)
async def get_report(cycle_id: str, db: DB, user: Actor, report_id: str) -> TechnicalReport:
    return await service.get_report(db, user, cycle_id, report_id)


@router.put("/cycles/{cycle_id}/reports/{report_id}", response_model=s.ReportOut)
async def update_report(
    cycle_id: str, db: DB, user: Actor, report_id: str, payload: s.ReportUpdate
) -> TechnicalReport:
    return await service.update_report(db, user, cycle_id, report_id, payload)


@router.post("/cycles/{cycle_id}/reports/{report_id}/approval", response_model=s.ReportOut)
async def approve_report(
    cycle_id: str, db: DB, user: Actor, report_id: str, payload: s.ReportApproval
) -> TechnicalReport:
    return await service.approve_report(db, user, cycle_id, report_id, payload)


@router.post(
    "/cycles/{cycle_id}/reports/{report_id}/corrections",
    response_model=s.ReportOut,
    status_code=201,
)
async def correct_report(
    cycle_id: str, db: DB, user: Actor, report_id: str, payload: s.ReportCorrection
) -> TechnicalReport:
    return await service.correct_report(db, user, cycle_id, report_id, payload)
