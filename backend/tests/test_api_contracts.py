from datetime import date


def transaction_payload(**overrides):
    payload = {
        "type": "expense",
        "description": "Mercado",
        "category": "Alimentação",
        "amount": 125.50,
        "due_date": date.today().isoformat(),
        "status": "paid",
    }
    payload.update(overrides)
    return payload


def test_transaction_crud_and_filters(client):
    expense = client.post("/transactions/", json=transaction_payload())
    assert expense.status_code == 200
    created = expense.json()
    assert created["id"] > 0
    assert created["source"] == "manual"

    income = client.post(
        "/transactions/",
        json=transaction_payload(
            type="income",
            description="Salário",
            category="Salário",
            amount=3000,
            priority=None,
        ),
    )
    assert income.status_code == 200

    filtered = client.get("/transactions/", params={"type": "expense"})
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()] == [created["id"]]

    updated = client.put(
        f"/transactions/{created['id']}",
        json={"description": "Supermercado"},
    )
    assert updated.status_code == 200
    assert updated.json()["description"] == "Supermercado"

    status = client.patch(
        f"/transactions/{created['id']}/status",
        json={"status": "pending"},
    )
    assert status.status_code == 200
    assert status.json()["status"] == "pending"

    removed = client.delete(f"/transactions/{created['id']}")
    assert removed.status_code == 200
    assert client.get(f"/transactions/{created['id']}").status_code == 404


def test_transaction_validation_and_not_found_contracts(client):
    invalid = client.post(
        "/transactions/",
        json=transaction_payload(amount=-1),
    )
    assert invalid.status_code == 422
    assert isinstance(invalid.json()["detail"], list)

    income_with_priority = client.post(
        "/transactions/",
        json=transaction_payload(type="income", priority="essential"),
    )
    assert income_with_priority.status_code == 422

    assert client.get("/transactions/999999").status_code == 404
    assert client.put("/transactions/999999", json={"amount": 10}).status_code == 404
    assert client.delete("/transactions/999999").status_code == 404


def test_transaction_update_rejects_invalid_resulting_domain_state(client):
    transaction = client.post(
        "/transactions/",
        json=transaction_payload(priority="essential"),
    ).json()

    response = client.put(
        f"/transactions/{transaction['id']}",
        json={"type": "income"},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "Receitas não podem ter prioridade."}
    persisted = client.get(f"/transactions/{transaction['id']}").json()
    assert persisted["type"] == "expense"
    assert persisted["priority"] == "essential"


def test_goals_contract(client):
    response = client.post(
        "/goals/",
        json={"name": "Reserva", "target_amount": 1000, "current_amount": 100},
    )
    assert response.status_code == 200
    goal = response.json()
    assert goal["progress_percentage"] == 10
    assert goal["remaining_amount"] == 900
    assert goal["status"] == "active"

    progress = client.post(
        f"/goals/{goal['id']}/progress",
        params={"amount": 250},
    )
    assert progress.status_code == 200
    assert progress.json()["current_amount"] == 350

    updated = client.put(f"/goals/{goal['id']}", json={"name": "Emergência"})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Emergência"

    assert client.post("/goals/999999/progress", params={"amount": 10}).status_code == 404
    assert client.delete(f"/goals/{goal['id']}").status_code == 200


def test_fixed_expenses_contract(client):
    response = client.post(
        "/fixed-expenses/",
        json={
            "name": "Internet",
            "category": "Contas",
            "amount": 99.90,
            "billing_day": 10,
        },
    )
    assert response.status_code == 200
    expense = response.json()
    assert expense["active"] is True

    active = client.get("/fixed-expenses/active")
    assert active.status_code == 200
    assert [item["id"] for item in active.json()] == [expense["id"]]

    updated = client.put(
        f"/fixed-expenses/{expense['id']}",
        json={"amount": 109.90},
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 109.90

    assert client.delete(f"/fixed-expenses/{expense['id']}").status_code == 200
    assert client.put("/fixed-expenses/999999", json={"amount": 10}).status_code == 404
