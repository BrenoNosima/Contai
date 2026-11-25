import logging

from contextvars import ContextVar
from functools import lru_cache
from typing import Annotated

from langchain.tools import ToolRuntime
from langchain_core.tools import tool
from pydantic import Field
from groq import APITimeoutError, PermissionDeniedError

from app.agents.runtime import AgentBudgetExceeded
from app.agents.analyst_agent import AnalystAgent
from app.agents.planning_agent import PlanningAgent
from app.core.ai_guardrails import redact_for_ai


logger = logging.getLogger(__name__)


ANALYSIS_UNAVAILABLE = "Não foi possível concluir a análise financeira agora. Tente novamente em instantes."
PLANNING_UNAVAILABLE = "Não foi possível concluir o planejamento financeiro agora. Tente novamente em instantes."
_delegation_active: ContextVar[bool] = ContextVar(
    "specialist_delegation_active",
    default=False,
)


@lru_cache
def get_analyst_agent() -> AnalystAgent:
    """Reuse the stateless analyst graph between delegated calls."""

    return AnalystAgent()


@lru_cache
def get_planning_agent() -> PlanningAgent:
    """Reuse the stateless planning graph between delegated calls."""

    return PlanningAgent()


def _conversation_history(runtime: ToolRuntime) -> list[dict[str, str]]:
    """Extract real conversational messages without exposing runtime to the LLM."""

    history = []
    state = runtime.state if isinstance(runtime.state, dict) else {}
    for message in state.get("messages", []):
        if isinstance(message, dict):
            role = message.get("role")
            content = message.get("content")
            has_tool_calls = bool(message.get("tool_calls"))
        else:
            role = {"human": "user", "ai": "assistant"}.get(
                getattr(message, "type", "")
            )
            content = getattr(message, "content", None)
            has_tool_calls = bool(getattr(message, "tool_calls", None))

        if (
            role in {"user", "assistant"}
            and isinstance(content, str)
            and content.strip()
            and not has_tool_calls
        ):
            history.append({"role": role, "content": content})
    return history


@tool(return_direct=True)
def analyze_finances(
    question: Annotated[str, Field(min_length=1, max_length=4000)],
    runtime: ToolRuntime,
) -> str:
    """Delega uma pergunta de análise histórica ao especialista READ-ONLY."""

    if _delegation_active.get():
        return ANALYSIS_UNAVAILABLE

    token = _delegation_active.set(True)
    try:
        history = _conversation_history(runtime)
        return redact_for_ai(get_analyst_agent().ask(question, history))
    except (AgentBudgetExceeded, APITimeoutError, PermissionDeniedError):
        raise
    except Exception as error:
        logger.warning("ai_specialist_failed specialist=analysis error_type=%s", type(error).__name__)
        return ANALYSIS_UNAVAILABLE
    finally:
        _delegation_active.reset(token)


@tool(return_direct=True)
def plan_finances(
    question: Annotated[str, Field(min_length=1, max_length=4000)],
    runtime: ToolRuntime,
) -> str:
    """Delega projeções futuras, compromissos, metas e cenários hipotéticos.

    Use para saldo futuro, fluxo projetado, dinheiro comprometido, simulação de
    compra parcelada, contribuição para meta e impacto de compra em meta. Não use
    para histórico, comparação passada, criação ou alteração de registros.
    """

    if _delegation_active.get():
        return PLANNING_UNAVAILABLE

    token = _delegation_active.set(True)
    try:
        history = _conversation_history(runtime)
        return redact_for_ai(get_planning_agent().ask(question, history))
    except (AgentBudgetExceeded, APITimeoutError, PermissionDeniedError):
        raise
    except Exception as error:
        logger.warning("ai_specialist_failed specialist=planning error_type=%s", type(error).__name__)
        return PLANNING_UNAVAILABLE
    finally:
        _delegation_active.reset(token)
