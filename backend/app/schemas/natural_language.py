from typing import Literal

from pydantic import BaseModel, Field, model_validator


class NaturalLanguageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


class NaturalLanguageResponse(BaseModel):
    type: Literal["income", "expense"]
    description: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    priority: Literal["essential", "desirable", "superfluous"] | None = None

    @model_validator(mode="after")
    def validate_priority(self):
        if self.type == "income" and self.priority is not None:
            raise ValueError("Receitas não podem ter prioridade.")
        return self
