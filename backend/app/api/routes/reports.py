from fastapi import APIRouter
from fastapi import Depends
from fastapi import Query

from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.report import ReportSummary

from app.services.report_service import (
    ReportService,
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)

service = ReportService()


@router.get("/summary", response_model=ReportSummary)
def report_summary(
    db: Session = Depends(get_db),
    months: int = Query(default=6, ge=1, le=24),
):
    """Resumo agregado dos últimos N meses para a tela de relatórios."""

    return service.summary(db, months=months)


@router.get("/monthly-trend")
def monthly_trend(
    db: Session = Depends(get_db),
    months: int = Query(default=6, ge=1, le=24),
):
    """Receitas vs. despesas dos últimos N meses — para o gráfico de tendência."""

    return service.monthly_trend(db, months=months)


@router.get("/monthly-balance")
def monthly_balance(
    db: Session = Depends(get_db),
    months: int = Query(default=6, ge=1, le=24),
):
    """Igual ao monthly-trend, mas já com o saldo calculado por mês."""

    return service.monthly_balance_table(db, months=months)


@router.get("/category-breakdown")
def category_breakdown(
    db: Session = Depends(get_db),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
):
    """Total por categoria (receitas e despesas) em um mês/ano — padrão: mês atual."""

    return service.category_breakdown(db, month=month, year=year)
