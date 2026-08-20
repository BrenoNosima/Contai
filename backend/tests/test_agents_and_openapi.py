from app.api.routes import chat as chat_route
from app.api.routes import transactions as transaction_routes
from app.agents.extractor_agent import ExtractorAgent
from app.schemas.natural_language import NaturalLanguageResponse


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


class FakeExtractionChain:
    def invoke(self, payload):
        assert payload == {"text": "recebi 500"}
        return NaturalLanguageResponse(
            type="income",
            description="Freelancer",
            category="Freelancer",
            amount=500,
        )


def test_extractor_returns_validated_structured_data():
    extractor = ExtractorAgent.__new__(ExtractorAgent)
    extractor.chain = FakeExtractionChain()

    result = extractor.extract("recebi 500")

    assert result == {
        "type": "income",
        "description": "Freelancer",
        "category": "Freelancer",
        "amount": 500.0,
        "priority": None,
    }


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
        "/metadata/finance",
    }
    assert expected <= set(schema["paths"])
    assert {"put", "patch"} <= set(schema["paths"]["/transactions/{transaction_id}"])
    assert {"put", "patch"} <= set(schema["paths"]["/goals/{goal_id}"])
    assert {"put", "patch"} <= set(schema["paths"]["/fixed-expenses/{expense_id}"])
    assert schema["paths"]["/transactions/{transaction_id}"]["put"]["deprecated"]
    assert schema["paths"]["/transactions/"]["post"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]["$ref"].endswith("TransactionResponse")
    dashboard_schema = schema["paths"]["/dashboard/"]["get"]["responses"]["200"][
        "content"
    ]["application/json"]["schema"]
    assert dashboard_schema["$ref"].endswith("DashboardSummaryResponse")
    trend_schema = schema["paths"]["/reports/monthly-trend"]["get"]["responses"][
        "200"
    ]["content"]["application/json"]["schema"]
    assert trend_schema["items"]["$ref"].endswith("MonthlyReportPoint")
    breakdown_schema = schema["paths"]["/reports/category-breakdown"]["get"][
        "responses"
    ]["200"]["content"]["application/json"]["schema"]
    assert breakdown_schema["$ref"].endswith("CategoryBreakdownResponse")


def test_finance_metadata_contract(client):
    response = client.get("/metadata/finance")

    assert response.status_code == 200
    metadata = response.json()
    assert "Alimentação" in metadata["categories"]
    assert "Outros" in metadata["categories"]
    assert metadata["priorities"] == [
        {"value": "essential", "label": "Essencial"},
        {"value": "desirable", "label": "Desejável"},
        {"value": "superfluous", "label": "Supérfluo"},
    ]
    assert metadata["recurrences"] == [
        {"value": "weekly", "label": "Semanal"},
        {"value": "monthly", "label": "Mensal"},
    ]
