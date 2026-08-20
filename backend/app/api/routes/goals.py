from fastapi import APIRouter
from fastapi import Body
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Query

from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.core.exceptions import DomainValidationError

from app.schemas.goal import (
    GoalCreate,
    GoalUpdate,
    GoalResponse,
    GoalProgress,
)

from app.services.goal_service import (
    GoalService,
)

router = APIRouter(
    prefix="/goals",
    tags=["Goals"],
)

service = GoalService()


@router.post(
    "/",
    response_model=GoalResponse,
)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
):
    return service.create_goal(
        db,
        payload,
    )


@router.get(
    "/",
    response_model=list[GoalResponse],
)
def get_all_goals(
    db: Session = Depends(get_db),
):
    return service.get_all_goals(db)


@router.get(
    "/{goal_id}",
    response_model=GoalResponse,
)
def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
):
    goal = service.get_goal(
        db,
        goal_id,
    )

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return goal


@router.put(
    "/{goal_id}",
    response_model=GoalResponse,
    deprecated=True,
)
@router.patch(
    "/{goal_id}",
    response_model=GoalResponse,
)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
):
    goal = service.update_goal(
        db,
        goal_id,
        payload,
    )

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return goal


@router.delete(
    "/{goal_id}",
)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
):
    success = service.delete_goal(
        db,
        goal_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return {
        "message": "Goal deleted successfully"
    }


@router.post(
    "/{goal_id}/progress",
    response_model=GoalResponse,
)
def add_progress(
    goal_id: int,
    payload: GoalProgress | None = Body(default=None),
    amount: float | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    progress_amount = payload.amount if payload is not None else amount
    if progress_amount is None:
        raise DomainValidationError("Informe o valor do progresso.")

    goal = service.add_progress(
        db,
        goal_id,
        progress_amount,
    )

    if not goal:
        raise HTTPException(
            status_code=404,
            detail="Goal not found",
        )

    return goal
