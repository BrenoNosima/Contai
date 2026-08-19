from datetime import date

from app.models.transaction import Transaction
from app.repositories.transaction_repository import TransactionRepository
from app.schemas.transaction import TransactionCreate
from app.services.transaction_service import TransactionService


def create_transaction(db, **overrides):
    values = {
        "type": "expense",
        "description": "Conta",
        "category": "Moradia",
        "amount": 100,
        "due_date": date.today(),
        "status": "paid",
    }
    values.update(overrides)
    return TransactionService().create_transaction(db, TransactionCreate(**values))


def test_dashboard_and_reports_ignore_pending_transactions(client, db_session):
    create_transaction(db_session, type="income", category="Salário", amount=1000)
    create_transaction(db_session, amount=250)
    create_transaction(db_session, amount=900, status="pending")

    dashboard = client.get("/dashboard/")
    assert dashboard.status_code == 200
    summary = dashboard.json()["summary"]
    assert summary == {
        "total_income": 1000.0,
        "total_expense": 250.0,
        "balance": 750.0,
    }

    trend = client.get("/reports/monthly-trend", params={"months": 1})
    assert trend.status_code == 200
    assert trend.json()[0]["income"] == 1000
    assert trend.json()[0]["expense"] == 250

    breakdown = client.get(
        "/reports/category-breakdown",
        params={"month": date.today().month, "year": date.today().year},
    )
    assert breakdown.status_code == 200
    assert breakdown.json()["expenses"] == [{"category": "Moradia", "amount": 250.0}]

    create_transaction(
        db_session,
        description="Despesa antiga",
        category="Outros",
        amount=5000,
        due_date=date(date.today().year - 1, date.today().month, 1),
    )

    summary_response = client.get("/reports/summary", params={"months": 1})
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["totals"] == {
        "income": 1000.0,
        "expense": 250.0,
        "net": 750.0,
    }
    assert summary["categories"] == [{"category": "Moradia", "amount": 250.0}]
    assert summary["monthly"][0]["balance"] == 750


def test_recurring_occurrence_generation_is_idempotent(client, db_session):
    template = create_transaction(
        db_session,
        description="Assinatura",
        amount=40,
        is_recurring=True,
        recurrence="monthly",
    )

    first = client.post("/transactions/generate-occurrences", params={"months_ahead": 3})
    assert first.status_code == 200
    assert first.json()
    assert all(item["parent_id"] == template.id for item in first.json())
    assert all(item["status"] == "pending" for item in first.json())

    second = client.post("/transactions/generate-occurrences", params={"months_ahead": 3})
    assert second.status_code == 200
    assert second.json() == []


def test_recurring_batch_rolls_back_on_duplicate(db_session):
    template = create_transaction(
        db_session,
        description="Template",
        is_recurring=True,
        recurrence="monthly",
    )
    occurrence_date = date(date.today().year + 1, 1, 10)
    duplicates = [
        Transaction(
            type="expense",
            description="Duplicada",
            category="Moradia",
            amount=100,
            source="recurring",
            due_date=occurrence_date,
            status="pending",
            is_recurring=False,
            parent_id=template.id,
        )
        for _ in range(2)
    ]

    created = TransactionRepository().create_many(db_session, duplicates)

    assert created == []
    assert (
        db_session.query(Transaction)
        .filter(Transaction.parent_id == template.id)
        .count()
        == 0
    )


def test_report_query_validation(client):
    assert client.get("/reports/monthly-trend", params={"months": 0}).status_code == 422
    assert client.get("/reports/category-breakdown", params={"month": 13}).status_code == 422
    assert client.get("/reports/summary", params={"months": 25}).status_code == 422
