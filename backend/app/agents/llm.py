from langchain_groq import ChatGroq

from app.core.config import SETTINGS


def create_chat_model() -> ChatGroq:
    """Cria o modelo compartilhado pelos fluxos de linguagem natural."""

    return ChatGroq(
        model=SETTINGS.groq_model,
        api_key=SETTINGS.groq_api_key,
        temperature=0,
    )
