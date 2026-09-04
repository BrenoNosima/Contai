from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

import app.tools.delegation_tools as delegation_module
from app.api.routes import chat as chat_route
from app.agents.analyst_agent import ANALYST_TOOLS
from app.agents.financial_agent import SYSTEM_PROMPT
from app.core.user_context import reset_current_user_id, set_current_user_id
from app.models.transaction import Transaction
from app.services.report_service import ReportService
from app.tools.delegation_tools import ANALYSIS_UNAVAILABLE, analyze_finances
from app.tools.registry import FINANCE_TOOLS


PRIVATE_ANALYTICS_TOOL_NAMES = {
    "get_period_summary",
    "compare_periods",
    "compare_category_periods",
    "get_top_expenses",
    "get_balance",
    "get_expenses_by_category",
    "get_monthly_report",
    "get_category_breakdown",
}
REMOVED_FINANCIAL_TOOL_NAMES = PRIVATE_ANALYTICS_TOOL_NAMES | {
    "get_dashboard_summary"
}


def runtime_with(*messages):
    return SimpleNamespace(state={"messages": list(messages)})


class RecordingAnalyst:
    def __init__(self, response="Análise concluída.", error=None):
        self.response = response
        self.error = error
        self.calls = []

    def ask(self, question, chat_history=None):
        self.calls.append((question, chat_history))
        if self.error:
            raise self.error
        return self.response


def call_delegation(question, runtime):
    return analyze_finances.func(question=question, runtime=runtime)


def test_financial_agent_has_one_delegation_and_no_private_analytics_tools():
    tool_names = [item.name for item in FINANCE_TOOLS]

    assert len(FINANCE_TOOLS) == 11
    assert tool_names.count("analyze_finances") == 1
    assert REMOVED_FINANCIAL_TOOL_NAMES.isdisjoint(tool_names)
    assert {
        "create_transaction",
        "mark_transaction_status",
        "generate_recurring_occurrences",
        "create_goal",
        "add_goal_progress",
        "create_fixed_expense",
    } <= set(tool_names)


def test_analyst_keeps_exactly_eight_read_only_tools_without_delegation():
    assert len(ANALYST_TOOLS) == 8
    assert {item.name for item in ANALYST_TOOLS} == PRIVATE_ANALYTICS_TOOL_NAMES
    assert "analyze_finances" not in {item.name for item in ANALYST_TOOLS}


def test_delegation_schema_exposes_only_question_to_model():
    schema = analyze_finances.tool_call_schema.model_json_schema()

    assert set(schema["properties"]) == {"question"}
    assert "user_id" not in schema["properties"]
    assert "chat_history" not in schema["properties"]
    assert "runtime" not in schema["properties"]


def test_delegation_passes_runtime_history_not_model_arguments(monkeypatch):
    analyst = RecordingAnalyst()
    monkeypatch.setattr(delegation_module, "get_analyst_agent", lambda: analyst)
    runtime = runtime_with(
        HumanMessage(content="Compare agosto com setembro."),
        AIMessage(content="Vou analisar os dois períodos."),
        HumanMessage(content="E Alimentação?"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "analyze_finances",
                    "args": {"question": "Compare Alimentação nos períodos."},
                    "id": "call-1",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(content="interno", tool_call_id="old-call"),
    )

    result = call_delegation("Compare Alimentação nos períodos.", runtime)

    assert result == "Análise concluída."
    assert analyst.calls == [
        (
            "Compare Alimentação nos períodos.",
            [
                {"role": "user", "content": "Compare agosto com setembro."},
                {
                    "role": "assistant",
                    "content": "Vou analisar os dois períodos.",
                },
                {"role": "user", "content": "E Alimentação?"},
            ],
        )
    ]


def test_delegation_preserves_authenticated_context_and_user_isolation(
    db_session,
    monkeypatch,
):
    day = date(2026, 8, 10)
    db_session.add_all(
        [
            Transaction(
                user_id=41,
                type="expense",
                description="Própria",
                category="Alimentação",
                amount=Decimal("100.00"),
                due_date=day,
                status="paid",
                is_recurring=False,
            ),
            Transaction(
                user_id=42,
                type="expense",
                description="Outro usuário",
                category="Alimentação",
                amount=Decimal("9000.00"),
                due_date=day,
                status="paid",
                is_recurring=False,
            ),
        ]
    )
    db_session.commit()

    class ContextAwareAnalyst:
        def ask(self, question, chat_history=None):
            summary = ReportService().get_period_summary(db_session, day, day)
            return str(summary["total_expenses"])

    monkeypatch.setattr(
        delegation_module,
        "get_analyst_agent",
        lambda: ContextAwareAnalyst(),
    )
    context_token = set_current_user_id(41)
    try:
        result = call_delegation(
            "Quanto gastei?",
            runtime_with(HumanMessage(content="Quanto gastei?")),
        )
    finally:
        reset_current_user_id(context_token)

    assert result == "100.00"


@pytest.mark.parametrize(
    ("question", "prompt_evidence"),
    [
        ("Quanto gastei em agosto?", '"Quanto gastei em agosto?"'),
        ("Compare agosto e setembro", '"Compare agosto e setembro"'),
        ("Minha alimentação aumentou?", '"Minha alimentação aumentou?"'),
        ("Quais foram meus maiores gastos?", '"Quais foram meus maiores gastos?"'),
        ("Liste minhas últimas transações", "listar transações recentes"),
        ("Gastei R$ 50 no mercado", "use a tool create_transaction"),
        ("Crie uma meta de R$ 5.000", "create_goal / create_fixed_expense"),
    ],
)
def test_financial_prompt_routes_each_domain_without_ambiguity(
    question,
    prompt_evidence,
):
    assert question
    assert prompt_evidence in SYSTEM_PROMPT


def test_financial_prompt_forbids_repeated_delegation_and_manual_fallback():
    assert "no máximo uma\n  vez para a mesma solicitação" in SYSTEM_PROMPT
    assert "não estime, não calcule\n  manualmente" in SYSTEM_PROMPT


def test_structural_cycle_guard_blocks_reentry(monkeypatch):
    analyst = RecordingAnalyst()
    monkeypatch.setattr(delegation_module, "get_analyst_agent", lambda: analyst)
    token = delegation_module._delegation_active.set(True)
    try:
        result = call_delegation("Compare os períodos.", runtime_with())
    finally:
        delegation_module._delegation_active.reset(token)

    assert result == ANALYSIS_UNAVAILABLE
    assert analyst.calls == []


def test_analyst_failure_returns_controlled_error_without_internal_details(monkeypatch):
    analyst = RecordingAnalyst(error=RuntimeError("secret stack detail"))
    monkeypatch.setattr(delegation_module, "get_analyst_agent", lambda: analyst)

    result = call_delegation("Compare os períodos.", runtime_with())

    assert result == ANALYSIS_UNAVAILABLE
    assert "secret stack detail" not in result
    assert "Não estime nem calcule" in result


def test_delegation_keeps_redacted_placeholders_for_outer_guardrail(monkeypatch):
    analyst = RecordingAnalyst(response="Análise de pessoa@example.com")
    monkeypatch.setattr(delegation_module, "get_analyst_agent", lambda: analyst)
    runtime = runtime_with(
        HumanMessage(content="Dados de [DADO_SENSIVEL_E_MAIL_1]")
    )

    result = call_delegation("Analise [DADO_SENSIVEL_E_MAIL_1]", runtime)

    assert "pessoa@example.com" not in result
    assert "[DADO_SENSIVEL_E_MAIL_1]" in result
    assert analyst.calls[0][1] == [
        {"role": "user", "content": "Dados de [DADO_SENSIVEL_E_MAIL_1]"}
    ]


def test_delegated_analysis_keeps_chat_contract_with_no_pending_actions(
    client,
    monkeypatch,
):
    analyst_response = "Com base nos dados registrados, foram R$ 100,00."
    fake_financial_agent = RecordingAnalyst(response=analyst_response)
    monkeypatch.setattr(
        chat_route,
        "get_agent",
        lambda: fake_financial_agent,
    )

    response = client.post(
        "/chat/",
        json={"message": "Quanto gastei em agosto?", "chat_history": []},
    )

    assert response.status_code == 200
    assert response.json()["response"] == analyst_response
    assert response.json().get("pending_actions", []) == []
