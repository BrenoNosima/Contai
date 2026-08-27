import logging
from functools import lru_cache

from fastapi import APIRouter
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_current_user
from app.core.dependencies import get_db
from app.core.user_context import set_current_user_id
from app.models.user import User

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)

from app.agents.financial_agent import FinancialAgent
from app.services.assistant_action_service import AssistantActionService

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
    response_model_exclude_defaults=True,
)
def chat(payload: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    set_current_user_id(current_user.id)
    try:
        history = [message.model_dump() for message in payload.chat_history]
        response = get_agent().ask(payload.message, history)

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception:
        logger.exception("Erro inesperado ao consultar o agente financeiro")
        raise HTTPException(
            status_code=502,
            detail="Não foi possível falar com o assistente agora. Tente novamente em instantes.",
        )

    return ChatResponse(response=response, pending_actions=AssistantActionService().pending(db))
