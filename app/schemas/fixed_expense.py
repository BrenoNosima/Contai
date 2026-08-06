from datetime import datetime

from pydantic import BaseModel


class FixedExpenseCreate(BaseModel):
    name: str
    category: str
    amount: float
    billing_day: int


class FixedExpenseUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    amount: float | None = None
    billing_day: int | None = None
    active: bool | None = None


class FixedExpenseResponse(BaseModel):
    id: int
    name: str
    category: str
    amount: float
    billing_day: int
    active: bool
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True