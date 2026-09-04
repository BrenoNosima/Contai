from decimal import Decimal
from typing import Annotated

from langchain_core.tools import tool
from pydantic import Field

from app.core.ai_guardrails import redact_for_ai
from app.services.planning_service import PlanningService
from app.tools.common import parse_iso_date, tool_db


service = PlanningService()


def _serializable(value):
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


def _optional_date(value: str | None, field_name: str):
    return parse_iso_date(value, field_name) if value else None


@tool
def get_committed_amount(start_date: str, end_date: str) -> dict:
    """Calcula despesas previstas e comprometidas em um período inclusivo."""

    parsed = _period(start_date, end_date)
    if isinstance(parsed, dict):
        return parsed
    with tool_db() as db:
        return redact_for_ai(
            _serializable(service.get_committed_amount(db, *parsed))
        )


@tool
def project_cash_flow(start_date: str, end_date: str) -> dict:
    """Projeta saldo com receitas e despesas previstas de um período."""

    parsed = _period(start_date, end_date)
    if isinstance(parsed, dict):
        return parsed
    with tool_db() as db:
        return redact_for_ai(
            _serializable(service.project_cash_flow(db, *parsed))
        )


@tool
def simulate_installment_purchase(
    amount: Annotated[Decimal, Field(gt=0)],
    installments: Annotated[int, Field(ge=1, le=120)],
    start_date: str | None = None,
) -> dict:
    """Simula parcelas e impacto mensal sem criar uma transação."""

    parsed_start = _optional_date(start_date, "start_date")
    if isinstance(parsed_start, dict):
        return parsed_start
    with tool_db() as db:
        return redact_for_ai(_serializable(
            service.simulate_installment_purchase(
                db,
                amount,
                installments,
                parsed_start,
            )
        ))


@tool
def calculate_goal_contribution(
    goal_id: Annotated[int, Field(ge=1)],
    target_date: str | None = None,
) -> dict:
    """Calcula a contribuição mensal necessária para uma meta existente."""

    parsed_target = _optional_date(target_date, "target_date")
    if isinstance(parsed_target, dict):
        return parsed_target
    with tool_db() as db:
        return redact_for_ai(_serializable(
            service.calculate_goal_contribution(db, goal_id, parsed_target)
        ))


@tool
def simulate_goal_impact(
    goal_id: Annotated[int, Field(ge=1)],
    purchase_amount: Annotated[Decimal, Field(gt=0)],
    installments: Annotated[int, Field(ge=1, le=120)],
    start_date: str | None = None,
) -> dict:
    """Simula o impacto mensal de uma compra sobre uma meta sem persistir."""

    parsed_start = _optional_date(start_date, "start_date")
    if isinstance(parsed_start, dict):
        return parsed_start
    with tool_db() as db:
        return redact_for_ai(_serializable(
            service.simulate_goal_impact(
                db,
                goal_id,
                purchase_amount,
                installments,
                parsed_start,
            )
        ))
