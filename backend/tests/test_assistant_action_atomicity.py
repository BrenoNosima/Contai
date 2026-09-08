from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, UTC
from threading import Barrier

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models.assistant_action import AssistantAction
from app.models.goal import Goal
from app.models.fixed_expense import FixedExpense
from app.models.transaction import Transaction
from app.services.assistant_action_service import AssistantActionService


def propose(db):
    db.info["user_id"] = 1
    item = AssistantActionService().propose(db, "create_goal", {
        "name": "Reserva", "target_amount": 100, "current_amount": 0,
    })
    return item.id


def test_confirm_commits_once_and_repetition_does_not_write(db_session, monkeypatch):
    action_id = propose(db_session)
    commits = []
    original = db_session.commit
    def commit():
        commits.append(True)
        original()
    monkeypatch.setattr(db_session, "commit", commit)
    result = AssistantActionService().confirm(db_session, action_id)
    assert result[0].status == "confirmed"
    assert len(commits) == 1
    assert AssistantActionService().confirm(db_session, action_id) is None
    assert db_session.query(Goal).count() == 1


def test_failure_after_financial_flush_rolls_back_both(db_session, monkeypatch):
    action_id = propose(db_session)
    service = AssistantActionService()
    original = service._execute
    def fail(db, item):
        original(db, item)
        assert db.query(Goal).count() == 1
        raise RuntimeError("after financial write")
    monkeypatch.setattr(service, "_execute", fail)
    with pytest.raises(RuntimeError):
        service.confirm(db_session, action_id)
    assert db_session.query(Goal).count() == 0
    assert db_session.get(AssistantAction, action_id).status == "pending"
    assert "defer_commit" not in db_session.info


def test_final_commit_failure_rolls_back_both(db_session, monkeypatch):
    action_id = propose(db_session)
    def fail():
        raise RuntimeError("commit failed")
    monkeypatch.setattr(db_session, "commit", fail)
    with pytest.raises(RuntimeError, match="commit failed"):
        AssistantActionService().confirm(db_session, action_id)
    assert db_session.query(Goal).count() == 0
    assert db_session.get(AssistantAction, action_id).status == "pending"


@pytest.mark.parametrize("action", sorted(AssistantActionService.allowed_actions))
def test_every_write_action_rolls_back_its_effects(db_session, monkeypatch, action):
    db_session.info["user_id"] = 1
    goal = Goal(name="Initial", target_amount=1000, current_amount=10)
    transaction = Transaction(type="income", description="Recurring", category="Outros",
                              amount=100, due_date=date.today(), status="paid",
                              is_recurring=True, recurrence="monthly")
    db_session.add_all([goal, transaction])
    db_session.commit()
    payloads = {
        "create_goal": {"name": "New", "target_amount": 100},
        "add_goal_progress": {"goal_id": goal.id, "amount": 5},
        "create_transaction": {"type": "income", "description": "New", "category": "Outros", "amount": 25},
        "mark_transaction_status": {"transaction_id": transaction.id, "status": "pending"},
        "generate_recurring_occurrences": {"months_ahead": 1},
        "create_fixed_expense": {"name": "New", "category": "Outros", "amount": 10, "billing_day": 1},
    }
    service = AssistantActionService()
    item = service.propose(db_session, action, payloads[action])
    action_id = item.id
    original = service._execute
    def fail(db, proposal):
        assert original(db, proposal) is not None
        raise RuntimeError("abort complete action")
    monkeypatch.setattr(service, "_execute", fail)
    with pytest.raises(RuntimeError):
        service.confirm(db_session, action_id)
    assert db_session.query(Goal).count() == 1
    assert db_session.query(Goal).one().current_amount == 10
    assert db_session.query(Transaction).count() == 1
    assert db_session.query(Transaction).one().status == "paid"
    assert db_session.query(FixedExpense).count() == 0
    assert db_session.get(AssistantAction, action_id).status == "pending"


def test_rejection_expiry_and_ownership(db_session):
    service = AssistantActionService()
    action_id = propose(db_session)
    db_session.info["user_id"] = 2
    assert service.confirm(db_session, action_id) is None
    assert service.reject(db_session, action_id) is None
    db_session.info["user_id"] = 1
    assert service.reject(db_session, action_id).status == "rejected"
    assert service.confirm(db_session, action_id) is None
    expired = propose(db_session)
    db_session.get(AssistantAction, expired).expires_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(seconds=1)
    db_session.commit()
    assert service.confirm(db_session, expired) is None
    assert db_session.query(Goal).count() == 0


@pytest.mark.parametrize("second_operation", ["confirm", "reject"])
def test_concurrent_claim_executes_at_most_once(tmp_path, second_operation):
    engine = create_engine("sqlite:///" + str(tmp_path / "actions.sqlite"), connect_args={"timeout": 10})
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        action_id = propose(db)
    barrier = Barrier(2)
    def invoke(operation):
        with Session(engine) as db:
            db.info["user_id"] = 1
            barrier.wait()
            return getattr(AssistantActionService(), operation)(db, action_id) is not None
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(invoke, operation) for operation in ("confirm", second_operation)]
            assert sum(f.result() for f in futures) == 1
        with Session(engine) as db:
            db.info["user_id"] = 1
            status = db.get(AssistantAction, action_id).status
            assert db.query(Goal).count() == (1 if status == "confirmed" else 0)
    finally:
        engine.dispose()
