from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.assistant_action import AssistantActionResponse
from app.services.assistant_action_service import AssistantActionService

router = APIRouter(prefix="/assistant-actions", tags=["Assistant actions"])
service = AssistantActionService()


@router.get("/", response_model=list[AssistantActionResponse])
def pending(db: Session = Depends(get_db)):
    return service.pending(db)


@router.post("/{action_id}/confirm", response_model=AssistantActionResponse)
def confirm(action_id: str, db: Session = Depends(get_db)):
    try:
        result = service.confirm(db, action_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    if not result:
        raise HTTPException(status_code=404, detail="Ação pendente não encontrada ou expirada.")
    return result[0]


@router.delete("/{action_id}", response_model=AssistantActionResponse)
def reject(action_id: str, db: Session = Depends(get_db)):
    result = service.reject(db, action_id)
    if not result:
        raise HTTPException(status_code=404, detail="Ação pendente não encontrada.")
    return result
