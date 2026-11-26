from langchain_groq import ChatGroq

from app.core.config import SETTINGS


def create_chat_model() -> ChatGroq:
    """Cria o modelo compartilhado pelos fluxos de linguagem natural."""

    return ChatGroq(
        model=SETTINGS.groq_model,
        api_key=SETTINGS.groq_api_key,
        temperature=0,
        request_timeout=min(SETTINGS.ai_timeout_seconds, SETTINGS.ai_request_timeout_seconds),
        # Retries are controlled by ExecutionLimits within a shared request budget.
        max_retries=0,
        max_tokens=2048,
        **({"reasoning_effort": "low"} if SETTINGS.groq_model.startswith("openai/gpt-oss-") else {}),
    )
