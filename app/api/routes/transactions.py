from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.core.dependencies import get_db

from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
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

extractor = ExtractorAgent()

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
):

    return service.get_all_transactions(db)


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

@router.post("/text")
def extract_transaction(
    payload: NaturalLanguageRequest,
):

    extractor = ExtractorAgent()

    return extractor.extract(
        payload.text
    )