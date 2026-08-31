from typing import Annotated, Literal

from langchain_core.tools import tool
from pydantic import Field

from app.tools.actions import propose
from app.core.ai_guardrails import redact_for_ai
from app.services.transaction_service import TransactionService
from app.tools.common import parse_iso_date, tool_db


service = TransactionService()


@tool
def create_transaction(
    type: Literal["income", "expense"],
    description: Annotated[str, Field(min_length=1, max_length=255)],
    category: Annotated[str, Field(min_length=1, max_length=100)],
    amount: Annotated[float, Field(gt=0)],
    priority: Literal["essential", "desirable", "superfluous"] | None = None,
    due_date: str | None = None,
    is_recurring: bool = False,
    recurrence: Literal["weekly", "monthly"] | None = None,
) -> dict:
    """
    Propõe uma receita ou despesa para confirmação do usuário.

    Use priority apenas para despesas. due_date usa AAAA-MM-DD; datas futuras
    entram pendentes. recurrence deve ser weekly ou monthly e é obrigatória
    quando is_recurring for verdadeiro. Infira category e priority pelo
    contexto; não peça esses campos quando houver uma opção razoável.
    """

    with tool_db() as db:
        parsed_due_date = parse_iso_date(due_date, "due_date")
        if isinstance(parsed_due_date, dict):
            return parsed_due_date

    return propose("create_transaction", {"type": type, "description": description,
        "category": category, "amount": amount, "priority": priority,
        "due_date": str(parsed_due_date) if parsed_due_date else None,
        "is_recurring": is_recurring, "recurrence": recurrence})


@tool
def mark_transaction_status(
    transaction_id: Annotated[int, Field(ge=1)],
    status: Literal["paid", "pending"],
) -> dict:
    """Marca uma transação existente como paid ou pending usando seu id."""

    return propose("mark_transaction_status", {"transaction_id": transaction_id, "status": status})


@tool
def search_transactions(
    type: Literal["income", "expense"] | None = None,
    category: Annotated[str | None, Field(max_length=100)] = None,
    status: Literal["paid", "pending"] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list:
    """
    Busca transações por tipo, categoria exata, status e período inclusivo.
    Datas devem usar o formato AAAA-MM-DD.
    """

    with tool_db() as db:
        parsed_start = parse_iso_date(start_date, "start_date")
        if isinstance(parsed_start, dict):
            return [parsed_start]
        parsed_end = parse_iso_date(end_date, "end_date")
        if isinstance(parsed_end, dict):
            return [parsed_end]

        transactions = service.list_transactions(
            db,
            type=type,
            category=category,
            status=status,
            start_date=parsed_start,
            end_date=parsed_end,
        )
        return redact_for_ai([
            {
                "id": item.id,
                "type": item.type,
                "description": item.description,
                "category": item.category,
                "amount": item.amount,
                "due_date": str(item.due_date),
                "status": item.status,
            }
            for item in transactions
        ])


@tool
def generate_recurring_occurrences(
    months_ahead: Annotated[int, Field(ge=1, le=12)] = 3,
) -> list:
    """Gera, sem duplicar, cobranças pendentes dos próximos meses."""

    return propose("generate_recurring_occurrences", {"months_ahead": months_ahead})


@tool
def get_balance() -> dict:
    """Retorna receitas pagas, despesas pagas e saldo atual."""

    with tool_db() as db:
        total_income, total_expense = service.get_totals(db)
        return redact_for_ai({
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
        })


@tool
def list_recent_transactions(
    limit: Annotated[int, Field(ge=1, le=100)] = 5,
) -> list:
    """Lista as transações cadastradas mais recentemente."""

    with tool_db() as db:
        return redact_for_ai([
            {
                "id": item.id,
                "type": item.type,
                "description": item.description,
                "category": item.category,
                "amount": item.amount,
                "status": item.status,
            }
            for item in service.get_recent_transactions(db, limit)
        ])


@tool
def get_expenses_by_category() -> list:
    """Retorna despesas pagas do histórico agrupadas por categoria."""

    with tool_db() as db:
        return redact_for_ai([
            {"category": category, "amount": total}
            for category, total in service.get_expenses_by_category(db)
        ])
