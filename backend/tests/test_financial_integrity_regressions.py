from app.core.clock import business_today
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.goal import Goal
from app.models.transaction import Transaction
from app.repositories.goal_repository import GoalRepository
from app.schemas.transaction import TransactionCreate
from app.services.report_service import ReportService


@pytest.mark.parametrize("amount", [0.001, float("inf"), float("nan"), 1000000000000])
def test_invalid_money_is_rejected_before_persistence(amount):
    with pytest.raises(ValidationError):
        TransactionCreate(type="expense", description="Synthetic", category="Outros", amount=amount)


def test_categories_and_monthly_totals_exclude_future_months(db_session):
    today = business_today()
    for due, amount in [(today, 10), (date(today.year + 1, 1, 1), 50)]:
        db_session.add(Transaction(type="expense", description="Synthetic", category="Outros",
                                   amount=amount, status="paid", due_date=due))
    db_session.commit()
    result = ReportService().summary(db_session)
    assert result["totals"]["expense"] == sum(item["amount"] for item in result["categories"]) == Decimal("10")


def test_stale_goal_object_cannot_overwrite_another_increment(db_session):
    goal = Goal(name="Synthetic", target_amount=100, current_amount=0)
    db_session.add(goal)
    db_session.commit()
    repository = GoalRepository()
    repository.add_progress(db_session, goal, 10)
    # Simulate another request having loaded an earlier value. The SQL increment
    # must use the stored value, rather than this stale ORM attribute.
    from sqlalchemy.orm.attributes import set_committed_value
    set_committed_value(goal, "current_amount", Decimal("0"))
    repository.add_progress(db_session, goal, 20)
    assert goal.current_amount == Decimal("30")
    repository.add_progress(db_session, goal, 100)
    assert goal.current_amount == Decimal("100")
