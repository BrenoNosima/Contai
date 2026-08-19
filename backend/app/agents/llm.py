from langchain_groq import ChatGroq

from app.core.config import GROQ_API_KEY, GROQ_MODEL


def create_chat_model() -> ChatGroq:
    """Cria o modelo compartilhado pelos fluxos de linguagem natural."""

    return ChatGroq(
        model=GROQ_MODEL,
        api_key=str(GROQ_API_KEY),
        temperature=0,
    )
