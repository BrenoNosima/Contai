import logging
from functools import lru_cache

from fastapi import APIRouter
from fastapi import HTTPException

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)

from app.agents.financial_agent import FinancialAgent

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)
logger = logging.getLogger(__name__)

# Instância única do agente: o LLM e as tools não guardam estado entre
# chamadas, cada tool abre sua própria sessão de banco.
@lru_cache
def get_agent() -> FinancialAgent:
    return FinancialAgent()


@router.post(
    "/",
    response_model=ChatResponse,
)
def chat(payload: ChatRequest):
    try:
        history = [message.model_dump() for message in payload.chat_history]
        response = get_agent().ask(payload.message, history)

    except Exception:
        logger.exception("Erro inesperado ao consultar o agente financeiro")
        raise HTTPException(
            status_code=502,
            detail="Não foi possível falar com o assistente agora. Tente novamente em instantes.",
        )

    return ChatResponse(
        response=response
    )
