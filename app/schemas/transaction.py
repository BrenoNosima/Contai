from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]

    description: str = Field(
        min_length=1,
        max_length=255,
    )

    category: str = Field(
        min_length=1,
        max_length=100,
    )

    amount: float = Field(gt=0)

    priority: (
        Literal[
            "essential",
            "desirable",
            "superfluous",
        ]
        | None
    ) = None

    source: Literal[
        "manual",
        "ai",
        "recurring",
    ] = "manual"


class TransactionUpdate(BaseModel):
    type: Literal[
        "income",
        "expense",
    ] | None = None

    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
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

    priority: (
        Literal[
            "essential",
            "desirable",
            "superfluous",
        ]
        | None
    ) = None


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