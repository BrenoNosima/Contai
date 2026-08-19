from pydantic import BaseModel


class MonthlyReportPoint(BaseModel):
    period: str
    month: str
    year: int
    income: float
    expense: float


class MonthlyBalancePoint(MonthlyReportPoint):
    balance: float


class ReportCategoryTotal(BaseModel):
    category: str
    amount: float


class ReportTotals(BaseModel):
    income: float
    expense: float
    net: float


class ReportSummary(BaseModel):
    monthly: list[MonthlyBalancePoint]
    categories: list[ReportCategoryTotal]
    totals: ReportTotals
