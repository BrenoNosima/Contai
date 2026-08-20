from typing import Annotated

from langchain_core.tools import tool
from pydantic import Field

from app.schemas.fixed_expense import FixedExpenseCreate
from app.services.fixed_expense_service import FixedExpenseService
from app.tools.common import tool_db


service = FixedExpenseService()


@tool
def create_fixed_expense(
    name: Annotated[str, Field(min_length=1, max_length=150)],
    category: Annotated[str, Field(min_length=1, max_length=100)],
    amount: Annotated[float, Field(gt=0)],
    billing_day: Annotated[int, Field(ge=1, le=31)],
) -> dict:
    """Cadastra uma despesa fixa mensal."""

    with tool_db() as db:
        expense = service.create_fixed_expense(
            db,
            FixedExpenseCreate(
                name=name,
                category=category,
                amount=amount,
                billing_day=billing_day,
            ),
        )
        return {
            "id": expense.id,
            "name": expense.name,
            "category": expense.category,
            "amount": expense.amount,
            "billing_day": expense.billing_day,
        }


@tool
def list_fixed_expenses(only_active: bool = True) -> list:
    """Lista despesas fixas, ativas por padrão."""

    with tool_db() as db:
        expenses = (
            service.get_active_fixed_expenses(db)
            if only_active
            else service.get_all_fixed_expenses(db)
        )
        return [
            {
                "id": expense.id,
                "name": expense.name,
                "category": expense.category,
                "amount": expense.amount,
                "billing_day": expense.billing_day,
                "active": expense.active,
            }
            for expense in expenses
        ]
