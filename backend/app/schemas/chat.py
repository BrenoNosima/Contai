from typing import Literal

from pydantic import BaseModel, Field, model_validator


MAX_CHAT_CONTEXT_CHARACTERS = 50_000


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=10000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    chat_history: list[ChatMessage] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_context_size(self):
        total = len(self.message) + sum(
            len(item.content) for item in self.chat_history
        )
        if total > MAX_CHAT_CONTEXT_CHARACTERS:
            raise ValueError(
                "O contexto da conversa excede o limite de 50000 caracteres."
            )
        return self


class ChatResponse(BaseModel):
    response: str
