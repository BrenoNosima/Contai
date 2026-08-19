from app.api.routes import chat as chat_route
from app.api.routes import transactions as transaction_routes


class FakeExtractor:
    def extract(self, text):
        assert text == "gastei 20 no café"
        return {
            "type": "expense",
            "description": "Café",
            "category": "Alimentação",
            "amount": 20,
            "priority": "desirable",
        }


class FakeAgent:
    def ask(self, message, history):
        assert message == "Qual meu saldo?"
        assert history == [{"role": "user", "content": "Oi"}]
        return "Seu saldo é R$ 100,00."


def test_create_transaction_from_text_without_calling_llm(client, monkeypatch):
    monkeypatch.setattr(transaction_routes, "get_extractor", lambda: FakeExtractor())

    response = client.post("/transactions/text", json={"text": "gastei 20 no café"})

    assert response.status_code == 200
    assert response.json()["description"] == "Café"
    assert response.json()["source"] == "ai"


def test_chat_contract_without_calling_llm(client, monkeypatch):
    monkeypatch.setattr(chat_route, "get_agent", lambda: FakeAgent())

    response = client.post(
        "/chat/",
        json={
            "message": "Qual meu saldo?",
            "chat_history": [{"role": "user", "content": "Oi"}],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"response": "Seu saldo é R$ 100,00."}


def test_openapi_exposes_core_contracts(client):
    schema = client.get("/openapi.json").json()

    expected = {
        "/transactions/",
        "/transactions/{transaction_id}",
        "/transactions/{transaction_id}/status",
        "/transactions/generate-occurrences",
        "/transactions/text",
        "/goals/",
        "/fixed-expenses/",
        "/dashboard/",
        "/reports/monthly-trend",
        "/reports/summary",
        "/chat/",
    }
    assert expected <= set(schema["paths"])
    assert schema["paths"]["/transactions/"]["post"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"].endswith("TransactionResponse")
