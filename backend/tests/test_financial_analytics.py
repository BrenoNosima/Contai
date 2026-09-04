from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.core.exceptions import DomainValidationError
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from app.services.report_service import ReportService
from app.services.transaction_service import TransactionService
from app.tools.analytics_tools import (
    compare_category_periods,
    compare_periods,
    get_period_summary,
    get_top_expenses,
)
from app.tools.registry import FINANCE_TOOLS


service = ReportService()
transaction_service = TransactionService()


def create_transaction(db, *, due_date: date, **overrides):
    db.info.setdefault("user_id", 1)
    values = {
        "type": "expense",
        "description": "Despesa",
        "category": "Alimentação",
        "amount": 100,
        "due_date": due_date,
        "status": "paid",
    }
    values.update(overrides)
    return transaction_service.create_transaction(db, TransactionCreate(**values))


def create_other_user_transaction(db, *, due_date: date, amount: int = 9000):
    current_user_id = db.info.pop("user_id")
    try:
        db.add(Transaction(
            user_id=current_user_id + 1000,
            type="expense",
            description="Despesa de outro usuário",
            category="Alimentação",
            amount=Decimal(amount),
            due_date=due_date,
            status="paid",
            is_recurring=False,
        ))
        db.commit()
    finally:
        db.info["user_id"] = current_user_id


def test_period_summary_uses_paid_due_date_and_decimal(db_session):
    start = date(2026, 8, 1)
    end = date(2026, 8, 31)
    create_transaction(db_session, due_date=start, type="income", amount=1000, category="Salário")
    create_transaction(db_session, due_date=end, amount=250)
    create_transaction(db_session, due_date=end, amount=999, status="pending")
    create_transaction(db_session, due_date=start - timedelta(days=1), amount=700)

    result = service.get_period_summary(db_session, start, end)

    assert result == {
        "start_date": "2026-08-01",
        "end_date": "2026-08-31",
        "total_income": Decimal("1000.00"),
        "total_expenses": Decimal("250.00"),
        "balance": Decimal("750.00"),
        "transaction_count": 2,
    }


def test_period_summary_empty_period(db_session):
    result = service.get_period_summary(
        db_session, date(2026, 7, 1), date(2026, 7, 31)
    )
    assert result["total_income"] == Decimal("0.00")
    assert result["total_expenses"] == Decimal("0.00")
    assert result["balance"] == Decimal("0.00")
    assert result["transaction_count"] == 0


def test_period_summary_rejects_inverted_period(db_session):
    with pytest.raises(DomainValidationError, match="data inicial"):
        service.get_period_summary(
            db_session, date(2026, 9, 1), date(2026, 8, 31)
        )


def test_period_summary_is_isolated_by_user(db_session):
    start = end = date(2026, 8, 15)
    create_transaction(db_session, due_date=start, amount=100)
    create_other_user_transaction(db_session, due_date=start)

    result = service.get_period_summary(db_session, start, end)

    assert result["total_expenses"] == Decimal("100.00")
    assert result["transaction_count"] == 1


def test_compare_periods_calculates_all_financial_changes(db_session):
    first_start, first_end = date(2026, 8, 1), date(2026, 8, 31)
    second_start, second_end = date(2026, 9, 1), date(2026, 9, 30)
    create_transaction(db_session, due_date=first_start, type="income", category="Salário", amount=1000)
    create_transaction(db_session, due_date=first_start, amount=800)
    create_transaction(db_session, due_date=second_start, type="income", category="Salário", amount=1200)
    create_transaction(db_session, due_date=second_start, amount=1100)

    result = service.compare_periods(
        db_session, first_start, first_end, second_start, second_end
    )

    assert result["first_period"]["balance"] == Decimal("200.00")
    assert result["second_period"]["balance"] == Decimal("100.00")
    assert result["changes"] == {
        "total_income": {
            "difference": Decimal("200.00"),
            "percentage_change": Decimal("20.00"),
        },
        "total_expenses": {
            "difference": Decimal("300.00"),
            "percentage_change": Decimal("37.50"),
        },
        "balance": {
            "difference": Decimal("-100.00"),
            "percentage_change": Decimal("-50.00"),
        },
    }


@pytest.mark.parametrize(
    ("first", "second", "difference", "percentage"),
    [
        ("100.00", "150.00", "50.00", "50.00"),
        ("100.00", "50.00", "-50.00", "-50.00"),
        ("100.00", "100.00", "0.00", "0.00"),
        ("0.00", "100.00", "100.00", None),
        ("100.00", "0.00", "-100.00", "-100.00"),
        ("0.00", "0.00", "0.00", None),
        ("-100.00", "0.00", "100.00", "100.00"),
    ],
)
def test_percentage_change_rules(first, second, difference, percentage):
    result = service._change(Decimal(first), Decimal(second))
    assert result["difference"] == Decimal(difference)
    assert result["percentage_change"] == (
        Decimal(percentage) if percentage is not None else None
    )


def test_compare_periods_is_isolated_by_user(db_session):
    first = date(2026, 8, 1)
    second = date(2026, 9, 1)
    create_transaction(db_session, due_date=first, amount=100)
    create_transaction(db_session, due_date=second, amount=200)
    create_other_user_transaction(db_session, due_date=first)
    create_other_user_transaction(db_session, due_date=second)

    result = service.compare_periods(
        db_session, first, first, second, second
    )

    assert result["changes"]["total_expenses"]["difference"] == Decimal("100.00")


@pytest.mark.parametrize(
    ("first_amount", "second_amount", "difference", "percentage"),
    [
        (800, 1100, "300.00", "37.50"),
        (1100, 800, "-300.00", "-27.27"),
        (0, 0, "0.00", None),
    ],
)
def test_compare_category_periods(
    db_session, first_amount, second_amount, difference, percentage
):
    first = date(2026, 8, 1)
    second = date(2026, 9, 1)
    if first_amount:
        create_transaction(db_session, due_date=first, amount=first_amount)
    if second_amount:
        create_transaction(db_session, due_date=second, amount=second_amount)

    result = service.compare_category_periods(
        db_session, "Alimentação", first, first, second, second
    )

    assert result["category"] == "Alimentação"
    assert result["first_period"]["total"] == Decimal(first_amount).quantize(Decimal("0.01"))
    assert result["second_period"]["total"] == Decimal(second_amount).quantize(Decimal("0.01"))
    assert result["difference"] == Decimal(difference)
    assert result["percentage_change"] == (
        Decimal(percentage) if percentage is not None else None
    )


def test_compare_category_valid_without_movements_and_rejects_unknown(db_session):
    period = date(2026, 8, 1)
    result = service.compare_category_periods(
        db_session, "Saúde", period, period, period, period
    )
    assert result["first_period"]["total"] == Decimal("0.00")
    with pytest.raises(DomainValidationError, match="Categoria"):
        service.compare_category_periods(
            db_session, "alimentacao", period, period, period, period
        )


def test_compare_category_is_isolated_by_user(db_session):
    first = date(2026, 8, 1)
    second = date(2026, 9, 1)
    create_transaction(db_session, due_date=first, amount=100)
    create_transaction(db_session, due_date=second, amount=150)
    create_other_user_transaction(db_session, due_date=first)
    create_other_user_transaction(db_session, due_date=second)

    result = service.compare_category_periods(
        db_session, "Alimentação", first, first, second, second
    )
    assert result["difference"] == Decimal("50.00")


def test_top_expenses_filters_orders_and_limits(db_session):
    start, end = date(2026, 8, 1), date(2026, 8, 31)
    create_transaction(db_session, due_date=start, description="Média", amount=200)
    create_transaction(db_session, due_date=end, description="Maior", amount=500)
    create_transaction(db_session, due_date=start, description="Menor", amount=50)
    create_transaction(db_session, due_date=start, type="income", category="Salário", amount=9000)
    create_transaction(db_session, due_date=start, description="Pendente", amount=8000, status="pending")
    create_transaction(db_session, due_date=end + timedelta(days=1), description="Fora", amount=7000)

    result = service.get_top_expenses(db_session, start, end, limit=2)

    assert [item["description"] for item in result] == ["Maior", "Média"]
    assert [item["amount"] for item in result] == [Decimal("500.00"), Decimal("200.00")]
    assert all(item["status"] == "paid" for item in result)
    assert all(start.isoformat() <= item["due_date"] <= end.isoformat() for item in result)


def test_top_expenses_returns_fewer_results_and_is_isolated(db_session):
    day = date(2026, 8, 15)
    own = create_transaction(db_session, due_date=day, amount=125)
    create_other_user_transaction(db_session, due_date=day)

    result = service.get_top_expenses(db_session, day, day, limit=20)

    assert result == [{
        "transaction_id": own.id,
        "description": "Despesa",
        "category": "Alimentação",
        "amount": Decimal("125.00"),
        "due_date": "2026-08-15",
        "status": "paid",
    }]


@pytest.mark.parametrize("limit", [0, 21])
def test_top_expenses_rejects_unsafe_limit(db_session, limit):
    with pytest.raises(DomainValidationError, match="limite"):
        service.get_top_expenses(
            db_session, date(2026, 8, 1), date(2026, 8, 31), limit
        )


def test_analytics_tools_are_read_only_serializable_and_not_registered():
    tool_names = {
        get_period_summary.name,
        compare_periods.name,
        compare_category_periods.name,
        get_top_expenses.name,
    }
    assert tool_names == {
        "get_period_summary",
        "compare_periods",
        "compare_category_periods",
        "get_top_expenses",
    }
    assert tool_names.isdisjoint({item.name for item in FINANCE_TOOLS})
    for analytics_tool in (
        get_period_summary,
        compare_periods,
        compare_category_periods,
        get_top_expenses,
    ):
        assert "user_id" not in analytics_tool.args_schema.model_json_schema()["properties"]
    limit_schema = get_top_expenses.args_schema.model_json_schema()["properties"]["limit"]
    assert limit_schema["minimum"] == 1
    assert limit_schema["maximum"] == 20
