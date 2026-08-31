from typing import Annotated

from langchain_core.tools import tool
from pydantic import Field

from app.services.report_service import ReportService
from app.core.ai_guardrails import redact_for_ai
from app.tools.common import tool_db


service = ReportService()


@tool
def get_monthly_report(
    months: Annotated[int, Field(ge=1, le=24)] = 6,
) -> list:
    """Retorna receitas, despesas e saldo dos últimos meses."""

    with tool_db() as db:
        return redact_for_ai(service.monthly_balance_table(db, months))


@tool
def get_category_breakdown(
    month: Annotated[int | None, Field(ge=1, le=12)] = None,
    year: Annotated[int | None, Field(ge=2000, le=2100)] = None,
) -> dict:
    """Retorna receitas e despesas por categoria; sem período, usa o mês atual."""

    with tool_db() as db:
        return redact_for_ai(service.category_breakdown(db, month=month, year=year))
