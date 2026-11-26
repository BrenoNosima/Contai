from types import SimpleNamespace
from datetime import date

from app.core import clock
from app.prompts.time_context import build_request_time_context
import app.main as main


def test_readiness_failure_is_not_reported_as_healthy(client, monkeypatch):
    def unavailable():
        raise RuntimeError("private connection detail")
    monkeypatch.setattr(main, "SessionLocal", unavailable)
    result = client.get("/ready")
    assert result.status_code == 503
    assert "private connection detail" not in result.text
    assert client.get("/health").json() == {"status": "healthy"}


def test_request_ids_are_present_on_security_rejections(client):
    result = client.post("/chat/", json={"message": "Synthetic"}, headers={"X-CSRF-Token": "invalid"})
    assert result.status_code == 403
    assert len(result.headers["x-request-id"]) == 32


def test_planning_time_context_handles_year_boundary():
    context = build_request_time_context(date(2026, 12, 31))
    assert "2027-01-01" in context and "2027-01-31" in context
    assert "2026-12-31" in context


def test_business_timezone_is_explicit():
    assert str(clock.BUSINESS_TIMEZONE) == "America/Sao_Paulo"


def test_exports_preserve_installment_and_recurrence_links(client):
    result = client.post("/transactions/installments", json={
        "description": "Synthetic", "category": "Outros", "total_amount": 90,
        "installment_count": 3, "first_due_date": "2026-11-01",
    })
    assert result.status_code == 200
    exported = client.get("/auth/me/export").json()["transactions"]
    assert {row["installment_number"] for row in exported} == {1, 2, 3}
    assert all(row["installment_group_id"] for row in exported)
    assert all("parent_id" in row and "fixed_expense_id" in row for row in exported)


def test_direct_routing_preserves_compound_requests_for_supervisor():
    from app.agents.routing import specialist_for
    assert specialist_for("Quanto vai sobrar no fim deste mês?") == "planning"
    assert specialist_for("Compare este mês com o mês passado.") == "analysis"
    assert specialist_for("Quanto vai sobrar no fim deste mês? Crie uma meta.") is None
