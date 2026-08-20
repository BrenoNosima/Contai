from fastapi import APIRouter

from app.core.financial_domain import (
    FINANCIAL_CATEGORIES,
    RECURRENCE_TYPES,
    TRANSACTION_PRIORITIES,
    TRANSACTION_STATUSES,
    TRANSACTION_TYPES,
)
from app.schemas.metadata import DomainOption, FinanceMetadataResponse


router = APIRouter(prefix="/metadata", tags=["Metadata"])


def _options(values: dict[str, str]) -> list[DomainOption]:
    return [DomainOption(value=value, label=label) for value, label in values.items()]


@router.get("/finance", response_model=FinanceMetadataResponse)
def finance_metadata() -> FinanceMetadataResponse:
    return FinanceMetadataResponse(
        categories=list(FINANCIAL_CATEGORIES),
        transaction_types=_options(TRANSACTION_TYPES),
        statuses=_options(TRANSACTION_STATUSES),
        priorities=_options(TRANSACTION_PRIORITIES),
        recurrences=_options(RECURRENCE_TYPES),
    )
