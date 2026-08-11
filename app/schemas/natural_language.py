from typing import Literal

from pydantic import BaseModel, Field


class NaturalLanguageRequest(BaseModel):
    text: str = Field(
        min_length=1,
    )


class NaturalLanguageResponse(BaseModel):
    type: Literal[
        "income",
        "expense",
    ]

    description: str = Field(
        min_length=1,
    )

    category: str = Field(
        min_length=1,
    )

    amount: float = Field(
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