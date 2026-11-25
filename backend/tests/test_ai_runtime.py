from dataclasses import replace
from concurrent.futures import ThreadPoolExecutor
from contextvars import copy_context
from types import SimpleNamespace

import httpx
import pytest
from groq import APIConnectionError, PermissionDeniedError
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage

from app.agents import runtime
from app.agents.financial_agent import FinancialAgent
from app.agents.runtime import (
    AgentBudgetExceeded, AgentUnavailableError, ExecutionLimits,
    execution_scope, final_text, recent_history,
)
from app.api.routes import chat as chat_route
from app.tools import delegation_tools


class Request:
    model_settings = {}

    def override(self, **kwargs):
        return SimpleNamespace(**kwargs)


def test_nested_scope_and_tool_worker_share_budget():
    with execution_scope() as outer:
        with execution_scope() as inner:
            assert inner is outer
        with ThreadPoolExecutor() as pool:
            def worker():
                with execution_scope() as nested:
                    return nested
            assert pool.submit(copy_context().run, worker).result() is outer
    with execution_scope() as other:
        assert other is not outer


def test_calls_stop_at_shared_limit(monkeypatch):
    monkeypatch.setattr(runtime, "SETTINGS", replace(runtime.SETTINGS, ai_max_model_calls=2))
    middleware = ExecutionLimits()
    with execution_scope():
        for _ in range(2):
            assert middleware.wrap_model_call(Request(), lambda _: "ok") == "ok"
        with pytest.raises(AgentBudgetExceeded):
            middleware.wrap_model_call(Request(), lambda _: pytest.fail("provider called after limit"))


def test_timeout_shrinks_and_expired_budget_blocks_tools(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr(runtime, "monotonic", lambda: clock[0])
    middleware = ExecutionLimits()
    with execution_scope() as budget:
        clock[0] = budget.deadline - 2
        assert middleware.wrap_model_call(Request(), lambda r: r.model_settings["timeout"]) == 2
        clock[0] = budget.deadline
        with pytest.raises(AgentBudgetExceeded):
            middleware.wrap_tool_call(SimpleNamespace(tool_call={"name": "create_transaction"}),
                                      lambda _: pytest.fail("late proposal executed"))


def test_retries_are_shared_and_do_not_replay_graph(monkeypatch):
    monkeypatch.setattr(runtime, "SETTINGS", replace(runtime.SETTINGS, ai_max_retries=1))
    attempts = []
    error = APIConnectionError(request=httpx.Request("POST", "https://example.invalid"))
    def provider(_):
        attempts.append(1)
        raise error
    with execution_scope() as budget:
        with pytest.raises(APIConnectionError):
            ExecutionLimits().wrap_model_call(Request(), provider)
        assert len(attempts) == 2
        assert budget.retries == 1
        with pytest.raises(APIConnectionError):
            ExecutionLimits().wrap_model_call(Request(), provider)
        assert len(attempts) == 3


@pytest.mark.parametrize("result", [{}, {"messages": []}, {"messages": [AIMessage(content="")]},
                                         {"messages": [AIMessage(content="   ")]}])
def test_missing_or_blank_output_is_unavailable(result):
    with pytest.raises(AgentUnavailableError):
        final_text(result)


def test_history_keeps_recent_whole_messages():
    history = [{"role": "user", "content": str(i) * 1000} for i in range(10)]
    assert recent_history(history, max_characters=2000) == history[-2:]


def test_real_graph_enforces_model_limit(monkeypatch):
    import app.agents.financial_agent as module
    class Model(FakeMessagesListChatModel):
        def bind_tools(self, tools, **kwargs):
            return self
    monkeypatch.setattr(module, "create_chat_model", lambda: Model(responses=[AIMessage(content="ok")]))
    monkeypatch.setattr(runtime, "SETTINGS", replace(runtime.SETTINGS, ai_max_model_calls=1))
    agent = FinancialAgent()
    with execution_scope():
        assert agent.ask("Olá") == "ok"
        with pytest.raises(AgentBudgetExceeded):
            agent.ask("Obrigado")


def test_timeout_from_specialist_is_not_swallowed(monkeypatch):
    def fail(*args):
        raise AgentBudgetExceeded()
    monkeypatch.setattr(delegation_tools, "get_analyst_agent", lambda: SimpleNamespace(ask=fail))
    with pytest.raises(AgentBudgetExceeded):
        delegation_tools.analyze_finances.func("Compare os meses", SimpleNamespace(state={}))


def test_route_returns_504_and_empty_response_returns_502(client, monkeypatch):
    def fail(*args):
        raise AgentBudgetExceeded()
    monkeypatch.setattr(chat_route, "get_agent", lambda: SimpleNamespace(ask=fail))
    assert client.post("/chat/", json={"message": "Compare os meses"}).status_code == 504
    monkeypatch.setattr(chat_route, "get_agent", lambda: SimpleNamespace(ask=lambda *a: ""))
    assert client.post("/chat/", json={"message": "Compare os meses"}).status_code == 502


def test_authentication_connection_is_released_during_model_wait(client, db_session, monkeypatch):
    def ask(*args):
        assert not db_session.in_transaction()
        return "Resposta."
    monkeypatch.setattr(chat_route, "get_agent", lambda: SimpleNamespace(ask=ask))
    assert client.post("/chat/", json={"message": "Compare os meses"}).status_code == 200


def test_provider_permission_failure_has_safe_actionable_log(client, monkeypatch, caplog):
    response = httpx.Response(403, request=httpx.Request("POST", "https://example.invalid"))
    def fail(*args):
        raise PermissionDeniedError("private provider detail", response=response,
                                    body={"error": {"code": "model_permission_blocked_project"}})
    monkeypatch.setattr(chat_route, "get_agent", lambda: SimpleNamespace(ask=fail))
    result = client.post("/chat/", json={"message": "Compare os meses"})
    assert result.status_code == 503
    assert "private provider detail" not in result.text
    assert "ai_provider_permission_denied" in caplog.text
