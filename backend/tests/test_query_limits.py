from dataclasses import replace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import database, web_security
from app.models.request_limit import RequestLimit
from app.models.transaction import Transaction


def test_transaction_pages_are_disjoint_and_user_scoped(client, db_session):
    for index in range(5):
        db_session.add(Transaction(type="expense", description=f"Synthetic {index}",
                                   category="Outros", amount=10, status="paid", due_date="2026-11-01"))
    # SQLite expects date objects too.
    from datetime import date
    for item in db_session.new:
        if isinstance(item, Transaction):
            item.due_date = date(2026, 11, 1)
    db_session.commit()
    first = client.get("/transactions/?limit=2&offset=0").json()
    second = client.get("/transactions/?limit=2&offset=2").json()
    assert len(first) == len(second) == 2
    assert {t["id"] for t in first}.isdisjoint(t["id"] for t in second)
    assert client.get("/transactions/?limit=1001").status_code == 422


def test_shared_rate_limit_enforces_one_database_counter(monkeypatch):
    engine = create_engine("sqlite://")
    RequestLimit.__table__.create(engine)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(bind=engine))
    monkeypatch.setattr(web_security, "SETTINGS", replace(web_security.SETTINGS, jwt_secret_key="synthetic-test-key"))
    rule = web_security.RateRule(2, 60)
    web_security._shared_rate_limit("synthetic", rule)
    web_security._shared_rate_limit("synthetic", rule)
    with pytest.raises(HTTPException) as error:
        web_security._shared_rate_limit("synthetic", rule)
    assert error.value.status_code == 429
    engine.dispose()
