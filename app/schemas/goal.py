from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=300)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0, ge=0)
    deadline: datetime | None = None


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=300)
    target_amount: float | None = Field(default=None, gt=0)
    current_amount: float | None = Field(default=None, ge=0)
    deadline: datetime | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in {"name", "target_amount", "current_amount"} & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} não pode ser nulo.")
        return self


class GoalResponse(BaseModel):
    id: int
    name: str
    description: str | None
    target_amount: float
    current_amount: float
    deadline: datetime | None
    progress_percentage: float
    remaining_amount: float
    status: str
    user_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
