from datetime import date
from functools import lru_cache

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query

from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.dependencies import get_db

from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionStatusUpdate,
)

from app.services.transaction_service import (
    TransactionService,
)

from app.agents.extractor_agent import (
    ExtractorAgent,
)

from app.schemas.natural_language import (
    NaturalLanguageRequest,
)

@lru_cache
def get_extractor() -> ExtractorAgent:
    return ExtractorAgent()

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)

service = TransactionService()


@router.post(
    "/",
    response_model=TransactionResponse,
)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
):

    return service.create_transaction(
        db=db,
        transaction_data=payload,
    )


@router.get(
    "/",
    response_model=list[TransactionResponse],
)
def get_all_transactions(
    db: Session = Depends(get_db),
    type: str | None = Query(
        default=None,
        description="Filtra por 'income' ou 'expense'.",
    ),
    category: str | None = Query(
        default=None,
        description="Filtra por categoria exata.",
    ),
    status: str | None = Query(
        default=None,
        description="Filtra por 'pending' ou 'paid'.",
    ),
    start_date: date | None = Query(
        default=None,
        description="Data de vencimento inicial (inclusive).",
    ),
    end_date: date | None = Query(
        default=None,
        description="Data de vencimento final (inclusive).",
    ),
    is_recurring: bool | None = Query(
        default=None,
        description="Filtra apenas modelos recorrentes (true) ou não (false).",
    ),
):
    """
    Lista transações. Sem parâmetros, retorna tudo (comportamento
    original). Com parâmetros, filtra — usado pela tela de Lançamentos.
    """

    return service.list_transactions(
        db,
        type=type,
        category=category,
        status=status,
        start_date=start_date,
        end_date=end_date,
        is_recurring=is_recurring,
    )


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):

    transaction = service.get_transaction(
        db,
        transaction_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return transaction


@router.put(
    "/{transaction_id}",
    response_model=TransactionResponse,
    deprecated=True,
)
@router.patch(
    "/{transaction_id}",
    response_model=TransactionResponse,
)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
):

    transaction = service.update_transaction(
        db,
        transaction_id,
        payload,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return transaction


@router.patch(
    "/{transaction_id}/status",
    response_model=TransactionResponse,
)
def update_transaction_status(
    transaction_id: int,
    payload: TransactionStatusUpdate,
    db: Session = Depends(get_db),
):
    """Marca uma transação como paga ou pendente."""

    transaction = service.update_status(
        db,
        transaction_id,
        payload.status,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return transaction


@router.delete(
    "/{transaction_id}",
)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):

    success = service.delete_transaction(
        db,
        transaction_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )

    return {
        "message": "Transaction deleted successfully"
    }


@router.post(
    "/generate-occurrences",
    response_model=list[TransactionResponse],
)
def generate_recurring_occurrences(
    db: Session = Depends(get_db),
    months_ahead: int = Query(
        default=3,
        ge=1,
        le=12,
        description="Quantos meses à frente projetar as próximas cobranças.",
    ),
):
    """
    Materializa as próximas ocorrências pendentes de todas as
    transações recorrentes (idempotente — não duplica quem já existe).
    A operação pode ser chamada novamente sem recriar ocorrências existentes.
    """

    return service.generate_recurring_occurrences(
        db,
        months_ahead=months_ahead,
    )


@router.post(
    "/text",
    response_model=TransactionResponse,
)
def create_transaction_from_text(
    payload: NaturalLanguageRequest,
    db: Session = Depends(get_db),
):
    """
    Extrai os dados de uma transação a partir de texto livre (via LLM)
    e já salva o resultado no banco de dados.
    """

    try:
        extracted = get_extractor().extract(payload.text)

    except (ValueError, ValidationError) as error:
        raise HTTPException(
            status_code=422,
            detail=f"Não foi possível interpretar o texto: {error}",
        )

    transaction_data = TransactionCreate(
        type=extracted.get("type"),
        description=extracted.get("description"),
        category=extracted.get("category"),
        amount=extracted.get("amount"),
        priority=extracted.get("priority"),
        source="ai",
    )

    return service.create_transaction(
        db=db,
        transaction_data=transaction_data,
    )
