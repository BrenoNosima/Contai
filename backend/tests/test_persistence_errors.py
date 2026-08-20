import pytest
from sqlalchemy.exc import IntegrityError, OperationalError

from app.api.routes import transactions as transaction_routes
from app.core.exceptions import (
    PersistenceConflictError,
    PersistenceUnavailableError,
)
from app.core.persistence import commit


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
