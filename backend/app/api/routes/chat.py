import logging
from functools import lru_cache

from fastapi import APIRouter
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from groq import APITimeoutError, PermissionDeniedError
from app.core.dependencies import get_current_user
from app.core.dependencies import get_db
from app.core.config import SETTINGS
from app.core.user_context import reset_current_user_id, set_current_user_id
from app.models.user import User

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
)

from app.agents.financial_agent import FinancialAgent
from app.agents.runtime import AgentUnavailableError, execution_scope
from app.core.ai_guardrails import validate_prompt
from app.services.quick_chat_service import quick_answer
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
    context_token = set_current_user_id(current_user.id)
    try:
        history = [message.model_dump() for message in payload.chat_history]
        validate_prompt(payload.message)
        for item in history:
            if item["role"] == "user":
                validate_prompt(item["content"])
        response = quick_answer(payload.message, db) if not history else None
        if response is None:
            # Authentication only reads. Release its connection while the model
            # runs; tools use their own short-lived, user-scoped sessions.
            db.rollback()
            with execution_scope():
                response = get_agent().ask(payload.message, history)
        if not isinstance(response, str) or not response.strip():
            raise AgentUnavailableError("Resposta vazia do assistente.")
        pending_actions = AssistantActionService().pending(db)

    except PermissionDeniedError as error:
        logger.error("ai_provider_permission_denied model=%s", SETTINGS.groq_model)
        raise HTTPException(status_code=503, detail="O assistente está indisponível por configuração do serviço. Tente novamente mais tarde.") from error
    except (TimeoutError, APITimeoutError) as error:
        logger.warning("ai_request_timeout error_type=%s", type(error).__name__)
        raise HTTPException(status_code=504, detail="O assistente demorou mais que o esperado. Tente novamente em instantes.") from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.error("ai_request_failed error_type=%s", type(error).__name__)
        raise HTTPException(
            status_code=502,
            detail="Não foi possível falar com o assistente agora. Tente novamente em instantes.",
        )
    finally:
        reset_current_user_id(context_token)

    return ChatResponse(response=response, pending_actions=pending_actions)
