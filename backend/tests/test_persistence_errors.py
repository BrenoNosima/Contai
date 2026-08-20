import pytest
from sqlalchemy.exc import IntegrityError, OperationalError

from app.api.routes import transactions as transaction_routes
from app.core import dependencies
from app.core.exceptions import (
    PersistenceConflictError,
    PersistenceUnavailableError,
)
from app.core.persistence import commit
from app.tools import common as tool_common


class FailingSession:
    def __init__(self, error):
        self.error = error
        self.rolled_back = False

    def commit(self):
        raise self.error

    def rollback(self):
        self.rolled_back = True

    def refresh(self, entity):
        raise AssertionError("refresh não deve ocorrer após falha no commit")


class ManagedSession:
    def __init__(self):
        self.rolled_back = False
        self.closed = False

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def test_integrity_error_rolls_back_and_becomes_conflict():
    session = FailingSession(IntegrityError("statement", {}, Exception("duplicate")))

    with pytest.raises(PersistenceConflictError):
        commit(session)

    assert session.rolled_back is True


def test_database_error_rolls_back_and_becomes_unavailable():
    session = FailingSession(OperationalError("statement", {}, Exception("offline")))

    with pytest.raises(PersistenceUnavailableError):
        commit(session)

    assert session.rolled_back is True


def test_tool_session_rolls_back_and_closes_after_unexpected_error(monkeypatch):
    session = ManagedSession()
    monkeypatch.setattr(tool_common, "SessionLocal", lambda: session)

    with pytest.raises(RuntimeError, match="tool failed"):
        with tool_common.tool_db():
            raise RuntimeError("tool failed")

    assert session.rolled_back is True
    assert session.closed is True


def test_request_session_rolls_back_and_closes_after_unexpected_error(monkeypatch):
    session = ManagedSession()
    monkeypatch.setattr(dependencies, "SessionLocal", lambda: session)
    session_dependency = dependencies.get_db()

    assert next(session_dependency) is session
    with pytest.raises(RuntimeError, match="request failed"):
        session_dependency.throw(RuntimeError("request failed"))

    assert session.rolled_back is True
    assert session.closed is True


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (
            PersistenceConflictError("A operação conflita com dados já existentes."),
            409,
            "A operação conflita com dados já existentes.",
        ),
        (
            PersistenceUnavailableError("segredo interno do banco"),
            503,
            "Banco de dados temporariamente indisponível.",
        ),
    ],
)
def test_api_translates_persistence_errors(
    client,
    monkeypatch,
    error,
    status_code,
    detail,
):
    def fail(*args, **kwargs):
        raise error

    monkeypatch.setattr(transaction_routes.service, "create_transaction", fail)

    response = client.post(
        "/transactions/",
        json={
            "type": "expense",
            "description": "Teste",
            "category": "Outros",
            "amount": 10,
        },
    )

    assert response.status_code == status_code
    assert response.json() == {"detail": detail}
