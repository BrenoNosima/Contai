from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.core.dependencies import get_db

from app.schemas.fixed_expense import (
    FixedExpenseCreate,
    FixedExpenseUpdate,
    FixedExpenseResponse,
)

from app.services.fixed_expense_service import (
    FixedExpenseService,
)

router = APIRouter(
    prefix="/fixed-expenses",
    tags=["Fixed Expenses"],
)

service = FixedExpenseService()


@router.post(
    "/",
    response_model=FixedExpenseResponse,
)
def create_fixed_expense(
    payload: FixedExpenseCreate,
    db: Session = Depends(get_db),
):

    return service.create_fixed_expense(
        db,
        payload,
    )


@router.get(
    "/",
    response_model=list[FixedExpenseResponse],
)
def get_all_fixed_expenses(
    db: Session = Depends(get_db),
):

    return service.get_all_fixed_expenses(
        db,
    )


@router.get(
    "/active",
    response_model=list[FixedExpenseResponse],
)
def get_active_fixed_expenses(
    db: Session = Depends(get_db),
):

    return service.get_active_fixed_expenses(
        db,
    )


@router.put(
    "/{expense_id}",
    response_model=FixedExpenseResponse,
    deprecated=True,
)
@router.patch(
    "/{expense_id}",
    response_model=FixedExpenseResponse,
)
def update_fixed_expense(
    expense_id: int,
    payload: FixedExpenseUpdate,
    db: Session = Depends(get_db),
):

    expense = service.update_fixed_expense(
        db,
        expense_id,
        payload,
    )

    if not expense:
        raise HTTPException(
            status_code=404,
            detail="Expense not found",
        )

    return expense


@router.delete(
    "/{expense_id}",
)
def delete_fixed_expense(
    expense_id: int,
    db: Session = Depends(get_db),
):

    success = service.delete_fixed_expense(
        db,
        expense_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Expense not found",
        )

    return {
        "message": "Expense deleted successfully"
    }
