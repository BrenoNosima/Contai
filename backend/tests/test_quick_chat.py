from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from app.api.routes import chat as chat_route
from app.models.transaction import Transaction
from app.models.user import User
from app.services.quick_chat_service import quick_answer, money


def test_quick_answer_uses_actual_scoped_paid_data_without_model(client, db_session, monkeypatch):
    owner = db_session.info["user_id"]
    today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    other = User(name="Other", email="other-fast@example.com", password_hash="unused")
    db_session.add(other)
    db_session.commit()
    for user_id, status, amount in [(owner, "paid", 1234.56), (owner, "pending", 500), (other.id, "paid", 9000)]:
        db_session.info["user_id"] = user_id
        db_session.add(Transaction(user_id=user_id, type="expense", description="Test", category="Outros",
                                   amount=amount, status=status, due_date=today))
        db_session.commit()
    db_session.info["user_id"] = owner
    monkeypatch.setattr(chat_route, "get_agent", lambda: pytest.fail("LLM called for a simple query"))
    result = client.post("/chat/", json={"message": "Quanto gastei este mês?"})
    assert result.status_code == 200
    assert "R$ 1.234,56" in result.json()["response"]
    assert "vencimento" in result.json()["response"]
    result = client.post("/chat/", json={"message": "Qual meu saldo?"})
    assert result.status_code == 200
    assert "R$ -1.234,56" in result.json()["response"]


@pytest.mark.parametrize("message", [
    "Quanto vou gastar este mês?", "Quanto gastei em alimentação este mês?",
    "Quanto gastei este mês? Crie uma meta", "E no mês passado?",
    "Qual meu saldo em dólares?", "Quanto vai sobrar no fim do mês?",
])
def test_ambiguous_or_compound_requests_do_not_use_shortcut(message):
    assert quick_answer(message, None) is None


def test_money_preserves_decimal_precision():
    assert money(Decimal("1234567.89")) == "R$ 1.234.567,89"
