from datetime import datetime

from pydantic import BaseModel, Field


class FixedExpenseCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150,
    )

    category: str = Field(
        min_length=1,
        max_length=100,
    )

    amount: float = Field(gt=0)

    billing_day: int = Field(
        ge=1,
        le=31,
    )


class FixedExpenseUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    amount: float | None = Field(
        default=None,
        gt=0,
    )

    billing_day: int | None = Field(
        default=None,
        ge=1,
        le=31,
    )

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