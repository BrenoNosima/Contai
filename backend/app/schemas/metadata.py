from pydantic import BaseModel


class DomainOption(BaseModel):
    value: str
    label: str


class FinanceMetadataResponse(BaseModel):
    categories: list[str]
    transaction_types: list[DomainOption]
    statuses: list[DomainOption]
    priorities: list[DomainOption]
    recurrences: list[DomainOption]
