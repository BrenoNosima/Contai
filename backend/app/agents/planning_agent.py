from functools import wraps

from langchain.agents import create_agent
from pydantic import ValidationError

from app.agents.llm import create_chat_model
from app.core.ai_guardrails import (
    redact_for_ai,
    redact_sensitive_input,
    restore_sensitive_data,
    sanitize_model_output,
    sensitive_redaction_scope,
    validate_prompt,
)
from app.prompts.planning_prompt import PLANNING_SYSTEM_PROMPT
from app.tools.planning_tools import (
    calculate_goal_contribution,
    get_committed_amount,
    project_cash_flow,
    simulate_goal_impact,
    simulate_installment_purchase,
)


def _sanitized_tool(source):
    # Cover parsing errors too: these may echo sensitive input before the service.
    @wraps(source.func)
    def invoke(*args, **kwargs):
        return redact_for_ai(source.func(*args, **kwargs))

    return source.model_copy(update={"func": invoke})


PLANNING_TOOLS = [
    _sanitized_tool(source)
    for source in (
        get_committed_amount,
        project_cash_flow,
        simulate_installment_purchase,
        calculate_goal_contribution,
        simulate_goal_impact,
    )
]


class PlanningAgent:
    """Explain deterministic planning results without persistence or memory."""

    def __init__(self):
        self.llm = create_chat_model()
        self.tools = PLANNING_TOOLS
        self.agent = create_agent(
            model=self.llm, tools=self.tools, system_prompt=PLANNING_SYSTEM_PROMPT,
        )

    def ask(self, message: str, chat_history: list[dict] | None = None) -> str:
        validate_prompt(message)
        with sensitive_redaction_scope():
            return self._ask_sanitized(message, chat_history)

    def _ask_sanitized(self, message, chat_history):
        messages = []
        for item in chat_history or []:
            if item.get("role") not in {"user", "assistant"}:
                raise ValueError("Histórico aceita somente user e assistant.")
            content = str(item.get("content", ""))
            if item["role"] == "user":
                validate_prompt(content)
            messages.append({
                "role": item["role"], "content": redact_sensitive_input(content),
            })
        messages.append({"role": "user", "content": redact_sensitive_input(message)})
        try:
            result = self.agent.invoke(
                {"messages": messages}, config={"recursion_limit": 8},
            )
        except (ValueError, ValidationError):
            result = self.agent.invoke(
                {"messages": [*messages, {
                    "role": "system",
                    "content": (
                        "A chamada anterior falhou por formatação de JSON ou "
                        "argumentos de tool. Tente novamente usando somente uma "
                        "tool de planejamento adequada, argumentos válidos e "
                        "datas no formato AAAA-MM-DD. Não invente dados ausentes."
                    ),
                }]}, config={"recursion_limit": 8},
            )
        if not result.get("messages"):
            raise ValueError("PlanningAgent retornou resposta vazia.")
        content = result["messages"][-1].content
        if not isinstance(content, str) or not content.strip():
            raise ValueError("PlanningAgent retornou resposta vazia ou inválida.")
        content = restore_sensitive_data(content)
        return sanitize_model_output(content.replace("\u202f", " ").replace("\u00a0", " "))
