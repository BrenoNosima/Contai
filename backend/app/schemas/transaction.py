from datetime import date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


TransactionStatus = Literal["pending", "paid"]
RecurrenceType = Literal["weekly", "monthly"]


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    description: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    priority: Literal["essential", "desirable", "superfluous"] | None = None
    source: Literal["manual", "ai", "recurring"] = "manual"

    # Dados de vencimento, pagamento e recorrência.
    due_date: date | None = None
    status: TransactionStatus | None = None
    is_recurring: bool = False
    recurrence: RecurrenceType | None = None

    @model_validator(mode="after")
    def validate_domain(self):
        if self.type == "income" and self.priority is not None:
            raise ValueError("Receitas não podem ter prioridade.")
        if self.is_recurring != (self.recurrence is not None):
            raise ValueError("is_recurring e recurrence devem ser informados juntos.")
        return self


class TransactionUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    description: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    amount: float | None = Field(default=None, gt=0)
    priority: Literal["essential", "desirable", "superfluous"] | None = None
    due_date: date | None = None
    status: TransactionStatus | None = None
    is_recurring: bool | None = None
    recurrence: RecurrenceType | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        required = {"type", "description", "category", "amount", "due_date", "status", "is_recurring"}
        for field in required & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} não pode ser nulo.")
        return self


class TransactionStatusUpdate(BaseModel):
    """Corpo usado por PATCH /transactions/{id}/status."""

    status: TransactionStatus


class TransactionResponse(BaseModel):
    id: int
    type: str
    description: str
    category: str
    amount: float
    priority: str | None
    source: str
    due_date: date
    status: TransactionStatus
    is_recurring: bool
    recurrence: RecurrenceType | None
    parent_id: int | None
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
