from datetime import datetime

from pydantic import BaseModel


class TransactionCreate(BaseModel):
    type: str
    description: str
    category: str
    amount: float
    priority: str | None = None
    source: str = "manual"


class TransactionUpdate(BaseModel):
    type: str | None = None
    description: str | None = None
    category: str | None = None
    amount: float | None = None
    priority: str | None = None


class TransactionResponse(BaseModel):
    id: int
    type: str
    description: str
    category: str
    amount: float
    priority: str | None
    source: str
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True