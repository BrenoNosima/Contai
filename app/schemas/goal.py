from datetime import datetime

from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    description: str | None = None
    target_amount: float
    current_amount: float = 0.0
    deadline: datetime | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    deadline: datetime | None = None


class GoalResponse(BaseModel):
    id: int
    name: str
    description: str | None
    target_amount: float
    current_amount: float
    deadline: datetime | None
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True