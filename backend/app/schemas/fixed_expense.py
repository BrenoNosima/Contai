from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FixedExpenseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    billing_day: int = Field(ge=1, le=31)


class FixedExpenseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    amount: float | None = Field(default=None, gt=0)
    billing_day: int | None = Field(default=None, ge=1, le=31)
    active: bool | None = None

    @model_validator(mode="after")
    def reject_null_fields(self):
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} não pode ser nulo.")
        return self


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

    model_config = ConfigDict(from_attributes=True)
