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

# Instância única do agente: o LLM e as tools não guardam estado entre
# chamadas, cada tool abre sua própria sessão de banco.
agent = FinancialAgent()


@router.post(
    "/",
    response_model=ChatResponse,
)
def chat(payload: ChatRequest):
    try:
        response = agent.ask(payload.message)

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Erro ao consultar o agente financeiro: {error}",
        )

    return ChatResponse(
        response=response
    )