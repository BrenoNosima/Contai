from typing import Literal

from pydantic import BaseModel

from app.schemas.report import ReportCategoryTotal


class DashboardTotals(BaseModel):
    total_income: float
    total_expense: float
    balance: float


class DashboardRecentTransaction(BaseModel):
    id: int
    description: str
    category: str
    amount: float
    type: Literal["income", "expense"]


class DashboardSummaryResponse(BaseModel):
    summary: DashboardTotals
    fixed_expenses_total: float
    goals_count: int
    expenses_by_category: list[ReportCategoryTotal]
    recent_transactions: list[DashboardRecentTransaction]


class TopCategoryResponse(BaseModel):
    category: str
    amount: float


class DashboardInsightResponse(BaseModel):
    message: str
