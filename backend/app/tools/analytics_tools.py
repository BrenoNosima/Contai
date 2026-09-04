from decimal import Decimal
from typing import Annotated

from langchain_core.tools import tool
from pydantic import Field

from app.core.ai_guardrails import redact_for_ai
from app.services.report_service import ReportService
from app.tools.common import parse_iso_date, tool_db


service = ReportService()


def _serializable(value):
    """Convert exact Decimal results to JSON-safe decimal strings."""

    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, dict):
        return {key: _serializable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serializable(item) for item in value]
    return value


def _period(start_date: str, end_date: str):
    parsed_start = parse_iso_date(start_date, "start_date")
    if isinstance(parsed_start, dict):
        return parsed_start
    parsed_end = parse_iso_date(end_date, "end_date")
    if isinstance(parsed_end, dict):
        return parsed_end
    return parsed_start, parsed_end


@tool
def get_period_summary(start_date: str, end_date: str) -> dict:
    """Resume receitas e despesas pagas em um período inclusivo por due_date."""

    parsed = _period(start_date, end_date)
    if isinstance(parsed, dict):
        return parsed
    with tool_db() as db:
        return redact_for_ai(
            _serializable(service.get_period_summary(db, *parsed))
        )


@tool
def compare_periods(
    first_start: str,
    first_end: str,
    second_start: str,
    second_end: str,
) -> dict:
    """Compara dois períodos inclusivos com diferenças e percentuais prontos."""

    first = _period(first_start, first_end)
    if isinstance(first, dict):
        return first
    second = _period(second_start, second_end)
    if isinstance(second, dict):
        return second
    with tool_db() as db:
        return redact_for_ai(
            _serializable(service.compare_periods(db, *first, *second))
        )


@tool
def compare_category_periods(
    category: Annotated[str, Field(min_length=1, max_length=100)],
    first_start: str,
    first_end: str,
    second_start: str,
    second_end: str,
) -> dict:
    """Compara despesas pagas de uma categoria exata em dois períodos."""

    first = _period(first_start, first_end)
    if isinstance(first, dict):
        return first
    second = _period(second_start, second_end)
    if isinstance(second, dict):
        return second
    with tool_db() as db:
        return redact_for_ai(
            _serializable(
                service.compare_category_periods(
                    db, category, *first, *second
                )
            )
        )


@tool
def get_top_expenses(
    start_date: str,
    end_date: str,
    limit: Annotated[int, Field(ge=1, le=20)] = 5,
) -> list:
    """Lista as maiores despesas pagas de um período, por due_date."""

    parsed = _period(start_date, end_date)
    if isinstance(parsed, dict):
        return [parsed]
    with tool_db() as db:
        return redact_for_ai(
            _serializable(service.get_top_expenses(db, *parsed, limit=limit))
        )
