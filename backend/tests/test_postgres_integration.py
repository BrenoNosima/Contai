"""Exercise SQL dialect and concurrency paths on the ephemeral CI database."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app.core import database, web_security
from app.models.user import User
from app.models.goal import Goal
from app.repositories.goal_repository import GoalRepository

pytestmark = pytest.mark.skipif(not os.getenv("POSTGRES_TEST_URL"), reason="Ephemeral PostgreSQL not configured")


def test_postgres_atomic_progress_and_shared_rate_limit(monkeypatch):
    url = os.environ["POSTGRES_TEST_URL"]
    assert make_url(url).database.endswith("_test"), "Integration tests require a dedicated test database"
    engine = create_engine(url)
    sessions = sessionmaker(bind=engine)
    with sessions() as db:
        user = User(name="Synthetic", email=f"{uuid4().hex}@example.com", password_hash="unused")
        db.add(user)
        db.commit()
        owner = user.id
        db.info["user_id"] = owner
        goal = Goal(name="Synthetic", target_amount=1000, current_amount=0)
        db.add(goal)
        db.commit()
        goal_id = goal.id
    def add(amount):
        with sessions() as db:
            db.info["user_id"] = owner
            repository = GoalRepository()
            repository.add_progress(db, repository.get_by_id(db, goal_id), amount)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(add, [10, 20]))
        with sessions() as db:
            db.info["user_id"] = owner
            assert db.get(Goal, goal_id).current_amount == 30
        monkeypatch.setattr(database, "SessionLocal", sessions)
        key = uuid4().hex
        rule = web_security.RateRule(2, 60)
        web_security._shared_rate_limit(key, rule)
        web_security._shared_rate_limit(key, rule)
        with pytest.raises(HTTPException) as error:
            web_security._shared_rate_limit(key, rule)
        assert error.value.status_code == 429
    finally:
        with sessions() as db:
            db.info["user_id"] = owner
            db.query(Goal).filter(Goal.id == goal_id).delete()
            db.query(User).filter(User.id == owner).delete()
            db.commit()
        engine.dispose()
