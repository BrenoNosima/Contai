from calendar import monthrange
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal

import pytest

import app.tools.planning_tools as planning_tools_module
from app.agents.analyst_agent import ANALYST_TOOLS
from app.core.exceptions import DomainValidationError
from app.core.user_context import reset_current_user_id, set_current_user_id
from app.models.fixed_expense import FixedExpense
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.services.planning_service import PlanningService
from app.services.transaction_service import TransactionService
from app.tools.planning_tools import (
    calculate_goal_contribution,
    get_committed_amount,
    project_cash_flow,
    simulate_goal_impact,
    simulate_installment_purchase,
)
from app.tools.registry import FINANCE_TOOLS


service = PlanningService()
PLANNING_TOOLS = [
    get_committed_amount,
    project_cash_flow,
    simulate_installment_purchase,
    calculate_goal_contribution,
    simulate_goal_impact,
]


def add_months(source: date, months: int) -> date:
    return service._add_months(source, months)


def add_transaction(db, *, due_date, user_id=1, **overrides):
    values = {
        "user_id": user_id,
        "type": "expense",
        "description": "Despesa",
        "category": "Outros",
        "amount": Decimal("100.00"),
        "due_date": due_date,
        "status": "pending",
        "is_recurring": False,
    }
    values.update(overrides)
    item = Transaction(**values)
    db.add(item)
    db.commit()
    return item


def add_goal(db, *, deadline=None, user_id=1, **overrides):
    values = {
        "user_id": user_id,
        "name": "Reserva",
        "target_amount": Decimal("1200.00"),
        "current_amount": Decimal("0.00"),
        "deadline": deadline,
    }
    values.update(overrides)
    goal = Goal(**values)
    db.add(goal)
    db.commit()
    return goal


def test_committed_amount_empty_period(db_session):
    day = add_months(date.today(), 1)
    result = service.get_committed_amount(db_session, day, day)
    assert result["committed_amount"] == Decimal("0.00")
    assert result["pending_transactions"] == Decimal("0.00")
    assert result["fixed_or_recurring_commitments"] == Decimal("0.00")


def test_committed_amount_counts_only_pending_expenses_in_period(db_session):
    day = add_months(date.today(), 1)
    add_transaction(db_session, due_date=day, amount=Decimal("300.00"))
    add_transaction(
        db_session,
        due_date=day,
        type="income",
        amount=Decimal("900.00"),
    )
    add_transaction(
        db_session,
        due_date=day,
        status="paid",
        amount=Decimal("700.00"),
    )
    add_transaction(
        db_session,
        due_date=add_months(day, 1),
        amount=Decimal("500.00"),
    )

    result = service.get_committed_amount(db_session, day, day)
    assert result["committed_amount"] == Decimal("300.00")


def test_committed_amount_counts_installments_as_pending_transactions(db_session):
    day = add_months(date.today(), 1)
    for number, amount in enumerate(("100.00", "100.00", "100.01"), start=1):
        add_transaction(
            db_session,
            due_date=add_months(day, number - 1),
            amount=Decimal(amount),
            installment_group_id="group-1",
            installment_number=number,
            installment_count=3,
        )
    result = service.get_committed_amount(db_session, day, add_months(day, 2))
    assert result["pending_transactions"] == Decimal("300.01")


def test_fixed_expense_projection_does_not_duplicate_materialized_occurrence(db_session):
    month = add_months(date.today().replace(day=1), 1)
    expense = FixedExpense(
        user_id=1,
        name="Academia",
        category="Saúde",
        amount=Decimal("150.00"),
        billing_day=10,
        active=True,
    )
    db_session.add(expense)
    db_session.commit()
    due = month.replace(day=10)
    add_transaction(
        db_session,
        due_date=due,
        amount=Decimal("150.00"),
        fixed_expense_id=expense.id,
    )

    month_end = month.replace(day=monthrange(month.year, month.month)[1])
    result = service.get_committed_amount(db_session, month, month_end)

    assert result["pending_transactions"] == Decimal("150.00")
    assert result["fixed_or_recurring_commitments"] == Decimal("0.00")
    assert result["committed_amount"] == Decimal("150.00")


def test_committed_amount_projects_unmaterialized_fixed_expense(db_session):
    month = add_months(date.today().replace(day=1), 1)
    db_session.add(FixedExpense(
        user_id=1,
        name="Internet",
        category="Contas",
        amount=Decimal("120.00"),
        billing_day=12,
        active=True,
    ))
    db_session.commit()
    result = service.get_committed_amount(
        db_session,
        month,
        month.replace(day=monthrange(month.year, month.month)[1]),
    )
    assert result["fixed_or_recurring_commitments"] == Decimal("120.00")


def test_recurring_projection_does_not_duplicate_materialized_occurrence(db_session):
    template_date = add_months(date.today(), -1)
    due = add_months(template_date, 2)
    template = add_transaction(
        db_session,
        due_date=template_date,
        status="paid",
        amount=Decimal("80.00"),
        is_recurring=True,
        recurrence="monthly",
    )
    add_transaction(
        db_session,
        due_date=due,
        amount=Decimal("80.00"),
        parent_id=template.id,
        source="recurring",
    )

    result = service.get_committed_amount(db_session, due, due)
    assert result["committed_amount"] == Decimal("80.00")
    assert result["fixed_or_recurring_commitments"] == Decimal("0.00")


def test_committed_amount_projects_unmaterialized_recurring_expense(db_session):
    template_date = add_months(date.today(), -1)
    due = add_months(template_date, 1)
    add_transaction(
        db_session,
        due_date=template_date,
        status="paid",
        amount=Decimal("80.00"),
        is_recurring=True,
        recurrence="monthly",
    )
    result = service.get_committed_amount(db_session, due, due)
    assert result["fixed_or_recurring_commitments"] == Decimal("80.00")


def test_committed_amount_is_isolated_by_user(db_session):
    day = add_months(date.today(), 1)
    add_transaction(db_session, due_date=day, user_id=1, amount=Decimal("100.00"))
    add_transaction(db_session, due_date=day, user_id=2, amount=Decimal("9000.00"))
    token = set_current_user_id(1)
    try:
        result = service.get_committed_amount(db_session, day, day)
    finally:
        reset_current_user_id(token)
    assert result["committed_amount"] == Decimal("100.00")


def test_committed_amount_rejects_inverted_period(db_session):
    day = date.today()
    with pytest.raises(DomainValidationError, match="data inicial"):
        service.get_committed_amount(db_session, day, add_months(day, -1))


def test_cash_flow_uses_current_balance_and_future_income_expense(db_session):
    future = add_months(date.today(), 1)
    add_transaction(
        db_session,
        due_date=date.today(),
        type="income",
        status="paid",
        amount=Decimal("1000.00"),
    )
    add_transaction(
        db_session,
        due_date=date.today(),
        status="paid",
        amount=Decimal("200.00"),
    )
    add_transaction(
        db_session,
        due_date=future,
        type="income",
        amount=Decimal("500.00"),
    )
    add_transaction(db_session, due_date=future, amount=Decimal("300.00"))

    result = service.project_cash_flow(db_session, future, future)
    assert result["current_balance"] == Decimal("800.00")
    assert result["expected_income"] == Decimal("500.00")
    assert result["committed_expenses"] == Decimal("300.00")
    assert result["projected_balance"] == Decimal("1000.00")
    assert result["projected_balance"] == (
        result["current_balance"]
        + result["expected_income"]
        - result["committed_expenses"]
    )


def test_cash_flow_empty_period_and_negative_balance(db_session):
    future = add_months(date.today(), 1)
    add_transaction(
        db_session,
        due_date=date.today(),
        status="paid",
        amount=Decimal("200.00"),
    )
    result = service.project_cash_flow(db_session, future, future)
    assert result["expected_income"] == Decimal("0.00")
    assert result["committed_expenses"] == Decimal("0.00")
    assert result["projected_balance"] == Decimal("-200.00")


def test_cash_flow_is_isolated_by_user(db_session):
    future = add_months(date.today(), 1)
    add_transaction(
        db_session,
        user_id=1,
        due_date=future,
        type="income",
        amount=Decimal("300.00"),
    )
    add_transaction(
        db_session,
        user_id=2,
        due_date=future,
        type="income",
        amount=Decimal("9000.00"),
    )
    token = set_current_user_id(1)
    try:
        result = service.project_cash_flow(db_session, future, future)
    finally:
        reset_current_user_id(token)
    assert result["expected_income"] == Decimal("300.00")


@pytest.mark.parametrize(
    ("amount", "installments", "expected"),
    [
        ("100.00", 1, [Decimal("100.00")]),
        ("300.00", 3, [Decimal("100.00")] * 3),
        (
            "3000.00",
            7,
            [Decimal("428.57")] * 6 + [Decimal("428.58")],
        ),
    ],
)
def test_installment_split_is_exact_and_shared(amount, installments, expected):
    result = TransactionService.split_installment_amounts(amount, installments)
    assert result == expected
    assert sum(result, Decimal("0")) == Decimal(amount)


@pytest.mark.parametrize(("amount", "installments"), [("0", 1), ("-1", 2), ("10", 0), ("10", 121)])
def test_installment_split_rejects_invalid_values(amount, installments):
    with pytest.raises(DomainValidationError):
        TransactionService.split_installment_amounts(amount, installments)


def test_installment_simulation_does_not_persist(db_session):
    before = db_session.query(Transaction).count()
    start = add_months(date.today(), 1)
    result = service.simulate_installment_purchase(
        db_session,
        Decimal("100.01"),
        2,
        start,
    )
    assert result["installment_amounts"] == [Decimal("50.00"), Decimal("50.01")]
    assert sum(result["installment_amounts"], Decimal("0")) == Decimal("100.01")
    assert db_session.query(Transaction).count() == before


def test_goal_contribution_normal_override_and_near_deadline(db_session):
    today = date.today()
    goal = add_goal(
        db_session,
        deadline=datetime.combine(add_months(today, 11), datetime.min.time()),
        current_amount=Decimal("200.00"),
    )
    normal = service.calculate_goal_contribution(db_session, goal.id, as_of=today)
    assert normal["months_remaining"] == 12
    assert normal["required_monthly_contribution"] == Decimal("83.34")
    override = service.calculate_goal_contribution(
        db_session,
        goal.id,
        today,
        as_of=today,
    )
    assert override["months_remaining"] == 1
    assert override["required_monthly_contribution"] == Decimal("1000.00")


def test_goal_contribution_completed_without_deadline(db_session):
    goal = add_goal(
        db_session,
        target_amount=Decimal("100.00"),
        current_amount=Decimal("150.00"),
    )
    result = service.calculate_goal_contribution(db_session, goal.id)
    assert result["remaining_amount"] == Decimal("0.00")
    assert result["months_remaining"] == 0
    assert result["required_monthly_contribution"] == Decimal("0.00")


def test_goal_contribution_rejects_missing_or_past_deadline(db_session):
    today = date.today()
    no_deadline = add_goal(db_session)
    with pytest.raises(DomainValidationError, match="não possui prazo"):
        service.calculate_goal_contribution(db_session, no_deadline.id, as_of=today)
    past = add_goal(
        db_session,
        deadline=datetime.combine(add_months(today, -1), datetime.min.time()),
    )
    with pytest.raises(DomainValidationError, match="já passou"):
        service.calculate_goal_contribution(db_session, past.id, as_of=today)


def test_goal_contribution_isolated_and_other_goal_is_not_found(db_session):
    future = add_months(date.today(), 3)
    own = add_goal(
        db_session,
        user_id=1,
        deadline=datetime.combine(future, datetime.min.time()),
    )
    other = add_goal(
        db_session,
        user_id=2,
        deadline=datetime.combine(future, datetime.min.time()),
    )
    own_id = own.id
    other_id = other.id
    token = set_current_user_id(1)
    try:
        assert service.calculate_goal_contribution(db_session, own_id)["goal_id"] == own_id
        with pytest.raises(DomainValidationError, match="não encontrada"):
            service.calculate_goal_contribution(db_session, other_id)
    finally:
        reset_current_user_id(token)


@pytest.mark.parametrize(
    ("pending_income", "pending_expense", "expected_after"),
    [
        ("500.00", "100.00", "300.00"),
        ("200.00", "100.00", "0.00"),
        ("100.00", "200.00", "-200.00"),
    ],
)
def test_goal_impact_reports_sufficient_reduced_and_deficit_margin(
    db_session,
    pending_income,
    pending_expense,
    expected_after,
):
    start = add_months(date.today(), 1)
    deadline = add_months(start, 9)
    goal = add_goal(
        db_session,
        target_amount=Decimal("1000.00"),
        deadline=datetime.combine(deadline, datetime.min.time()),
    )
    add_transaction(
        db_session,
        due_date=start,
        type="income",
        amount=Decimal(pending_income),
    )
    add_transaction(
        db_session,
        due_date=start,
        amount=Decimal(pending_expense),
    )
    result = service.simulate_goal_impact(
        db_session,
        goal.id,
        Decimal("100.00"),
        1,
        start,
    )
    impact = result["goal_period_impacts"][0]
    assert impact["required_monthly_contribution"] == Decimal("90.91")
    assert impact["monthly_available_after"] == Decimal(expected_after)
    assert impact["goal_surplus_after"] == Decimal(expected_after) - Decimal("90.91")


def test_goal_impact_completed_and_does_not_persist(db_session):
    start = add_months(date.today(), 1)
    goal = add_goal(
        db_session,
        target_amount=Decimal("100.00"),
        current_amount=Decimal("100.00"),
    )
    before_transactions = db_session.query(Transaction).count()
    before_goal = Decimal(str(goal.current_amount))
    result = service.simulate_goal_impact(
        db_session,
        goal.id,
        Decimal("50.00"),
        1,
        start,
    )
    assert result["goal"]["required_monthly_contribution"] == Decimal("0.00")
    assert db_session.query(Transaction).count() == before_transactions
    db_session.refresh(goal)
    assert goal.current_amount == before_goal


def test_goal_impact_cannot_access_another_users_goal(db_session):
    start = add_months(date.today(), 1)
    other = add_goal(
        db_session,
        user_id=2,
        deadline=datetime.combine(add_months(start, 3), datetime.min.time()),
    )
    other_id = other.id
    token = set_current_user_id(1)
    try:
        with pytest.raises(DomainValidationError, match="não encontrada"):
            service.simulate_goal_impact(
                db_session,
                other_id,
                Decimal("50.00"),
                1,
                start,
            )
    finally:
        reset_current_user_id(token)


def test_planning_tools_are_serializable_sanitized_and_unregistered(monkeypatch):
    names = {item.name for item in PLANNING_TOOLS}
    assert names.isdisjoint({item.name for item in FINANCE_TOOLS})
    assert names.isdisjoint({item.name for item in ANALYST_TOOLS})
    assert len(FINANCE_TOOLS) == 11
    assert len(ANALYST_TOOLS) == 8
    for planning_tool in PLANNING_TOOLS:
        assert "user_id" not in planning_tool.args_schema.model_json_schema()["properties"]

    @contextmanager
    def fake_db():
        yield object()

    monkeypatch.setattr(planning_tools_module, "tool_db", fake_db)
    monkeypatch.setattr(
        planning_tools_module.service,
        "calculate_goal_contribution",
        lambda *_args: {
            "goal_name": "Meta de pessoa@example.com",
            "required_monthly_contribution": Decimal("10.00"),
        },
    )
    result = calculate_goal_contribution.invoke({"goal_id": 1})
    assert result["required_monthly_contribution"] == "10.00"
    assert "pessoa@example.com" not in result["goal_name"]
