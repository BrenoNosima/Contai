from pydantic import BaseModel


class NaturalLanguageRequest(BaseModel):
    text: str


class NaturalLanguageResponse(BaseModel):
    type: str
    description: str
    category: str
    amount: float
    priority: str | None = None