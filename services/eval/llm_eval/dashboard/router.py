from fastapi import APIRouter

from llm_eval.dashboard.logic.get_dashboard_data import (
    get_dashboard_data,
    DashboardData,
)
from llm_eval.db import SessionDep

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_data(db: SessionDep) -> DashboardData:
    return await get_dashboard_data(db)
