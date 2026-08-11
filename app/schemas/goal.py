from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class GoalCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=300,
    )

    target_amount: float = Field(gt=0)

    current_amount: float = Field(
        default=0,
        ge=0,
    )

    deadline: datetime | None = None

    @model_validator(mode="after")
    def validate_current_amount(self):
        if self.current_amount > self.target_amount:
            raise ValueError(
                "current_amount não pode ser maior que target_amount"
            )

        return self


class GoalUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=300,
    )

    target_amount: float | None = Field(
        default=None,
        gt=0,
    )

    current_amount: float | None = Field(
        default=None,
        ge=0,
    )

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