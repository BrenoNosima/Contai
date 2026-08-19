from pydantic import BaseModel, Field


class NaturalLanguageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


class NaturalLanguageResponse(BaseModel):
    type: str
    description: str
    category: str
    amount: float
    priority: str | None = None
