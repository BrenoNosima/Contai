from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.core.dependencies import get_db

from app.services.dashboard_service import (
    DashboardService,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

service = DashboardService()


@router.get("/")
def dashboard_summary(
    db: Session = Depends(get_db),
):

    return service.get_dashboard_summary(
        db
    )

@router.get("/top-category")
def get_top_category(
    db: Session = Depends(get_db)
):
    return service.get_top_category(
        db
    )

@router.get("/insights")
def insights(
    db: Session = Depends(get_db),
):

    return service.get_insights(
        db
    )