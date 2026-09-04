from langchain.agents import create_agent
from pydantic import ValidationError

from app.agents.llm import create_chat_model
from app.core.ai_guardrails import (
    redact_sensitive_input,
    restore_sensitive_data,
    sanitize_model_output,
    sensitive_redaction_scope,
    validate_prompt,
)
from app.prompts.analyst_prompt import ANALYST_SYSTEM_PROMPT
from app.tools.analytics_tools import (
    compare_category_periods,
    compare_periods,
    get_period_summary,
    get_top_expenses,
)
from app.tools.report_tools import get_category_breakdown, get_monthly_report
from app.tools.transaction_tools import get_balance, get_expenses_by_category


ANALYST_TOOLS = [
    get_period_summary,
    compare_periods,
    compare_category_periods,
    get_top_expenses,
    get_balance,
    get_expenses_by_category,
    get_monthly_report,
    get_category_breakdown,
]


class AnalystAgent:
    """Read-only specialist that explains deterministic financial analyses."""

    def __init__(self):
        self.llm = create_chat_model()
        self.tools = ANALYST_TOOLS
        self.agent = create_agent(
            model=self.llm,
            tools=self.tools,
            system_prompt=ANALYST_SYSTEM_PROMPT,
        )

    def ask(
        self,
        message: str,
        chat_history: list[dict] | None = None,
    ) -> str:
        validate_prompt(message)
        with sensitive_redaction_scope():
            return self._ask_sanitized(message, chat_history)

    def _ask_sanitized(
        self,
        message: str,
        chat_history: list[dict] | None = None,
    ) -> str:
        for item in chat_history or []:
            if item.get("role") == "user":
                validate_prompt(str(item.get("content", "")))

        messages = [
            {
                **item,
                "content": redact_sensitive_input(str(item.get("content", ""))),
            }
            for item in (chat_history or [])
        ]
        validate_prompt(message)
        messages.append(
            {
                "role": "user",
                "content": redact_sensitive_input(message),
            }
        )

        try:
            result = self.agent.invoke(
                {"messages": messages},
                config={"recursion_limit": 8},
            )
        except (ValueError, ValidationError):
            result = self.agent.invoke(
                {
                    "messages": [
                        *messages,
                        {
                            "role": "system",
                            "content": (
                                "A chamada anterior falhou por formatação de JSON "
                                "ou argumentos de tool. Tente novamente usando "
                                "somente uma tool analítica adequada, argumentos "
                                "válidos e datas no formato AAAA-MM-DD."
                            ),
                        },
                    ]
                },
                config={"recursion_limit": 8},
            )

        final_message = result["messages"][-1]
        content = restore_sensitive_data(str(final_message.content))
        return sanitize_model_output(
            content.replace("\u202f", " ").replace("\u00a0", " ")
        )
