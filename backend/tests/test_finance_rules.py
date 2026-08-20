from datetime import date

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.schemas.fixed_expense import FixedExpenseCreate
from app.schemas.natural_language import NaturalLanguageResponse
from app.schemas.transaction import TransactionCreate
from app.services.report_service import ReportService
from app.services.transaction_service import TransactionService, _add_months
from app.tools.finance_tools import FINANCE_TOOLS


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_rejects_invalid_financial_input():
    with pytest.raises(ValidationError):
        TransactionCreate(
            type="expense", description="Teste", category="Outros", amount=-1
        )
    with pytest.raises(ValidationError):
        TransactionCreate(
            type="income", description="Salário", category="Salário", amount=10,
            priority="essential",
        )
    with pytest.raises(ValidationError):
        FixedExpenseCreate(name="Conta", category="Moradia", amount=10, billing_day=32)
    with pytest.raises(ValidationError):
        NaturalLanguageResponse(
            type="income",
            description="Salário",
            category="Salário",
            amount=100,
            priority="essential",
        )


def test_monthly_recurrence_preserves_last_valid_day():
    assert _add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert _add_months(date(2026, 1, 31), 2) == date(2026, 3, 31)
    assert _add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)


def test_recurring_projection_does_not_duplicate_template_date():
    start = date.today().replace(day=min(date.today().day, 28))
    dates = TransactionService._project_dates(start, "monthly", months_ahead=3)
    assert start not in dates
    assert dates
    assert dates[0] == _add_months(start, 1)


def test_balance_and_reports_ignore_pending_transactions(db):
    service = TransactionService()
    for status, amount in (("paid", 100), ("pending", 900)):
        service.create_transaction(
            db,
            TransactionCreate(
                type="income", description=status, category="Salário",
                amount=amount, status=status, due_date=date.today(),
            ),
        )

    assert float(service.repository.get_total_income(db)) == 100
    trend = ReportService().monthly_trend(db, months=1)
    assert trend[0]["income"] == 100
    assert trend[0]["expense"] == 0


def test_transaction_service_exposes_queries_used_by_agent_tools(db):
    service = TransactionService()
    service.create_transaction(
        db,
        TransactionCreate(
            type="expense",
            description="Mercado",
            category="Alimentação",
            amount=75,
            status="paid",
            due_date=date.today(),
        ),
    )

    income, expense = service.get_totals(db)
    assert float(income) == 0
    assert float(expense) == 75
    assert service.get_balance(db) == -75
    assert service.get_recent_transactions(db, limit=1)[0].description == "Mercado"
    assert service.get_expenses_by_category(db)[0][0] == "Alimentação"


def test_tool_schemas_expose_domain_constraints():
    assert [tool.name for tool in FINANCE_TOOLS] == [
        "create_transaction",
        "mark_transaction_status",
        "search_transactions",
        "generate_recurring_occurrences",
        "get_balance",
        "list_recent_transactions",
        "get_expenses_by_category",
        "get_monthly_report",
        "get_category_breakdown",
        "create_goal",
        "list_goals",
        "add_goal_progress",
        "create_fixed_expense",
        "list_fixed_expenses",
        "get_dashboard_summary",
    ]
    tools = {tool.name: tool for tool in FINANCE_TOOLS}
    create_schema = tools["create_transaction"].args_schema.model_json_schema()
    assert create_schema["properties"]["type"]["enum"] == ["income", "expense"]
    assert create_schema["properties"]["amount"]["exclusiveMinimum"] == 0

    recurrence_schema = tools[
        "generate_recurring_occurrences"
    ].args_schema.model_json_schema()["properties"]["months_ahead"]
    assert recurrence_schema["minimum"] == 1
    assert recurrence_schema["maximum"] == 12
