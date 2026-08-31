from langchain_core.prompts import ChatPromptTemplate

from app.agents.llm import create_chat_model
from app.core.ai_guardrails import redact_sensitive_input, restore_sensitive_data, sensitive_redaction_scope
from app.prompts.extraction_prompt import EXTRACTION_PROMPT
from app.schemas.natural_language import NaturalLanguageResponse


class ExtractorAgent:
    def __init__(self):
        self.llm = create_chat_model()
        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", EXTRACTION_PROMPT),
                ("human", "{text}"),
            ]
        )
        self.chain = self.prompt | self.llm.with_structured_output(
            NaturalLanguageResponse
        )

    def extract(self, text: str) -> NaturalLanguageResponse:
        with sensitive_redaction_scope():
            result: NaturalLanguageResponse = self.chain.invoke({"text": redact_sensitive_input(text)})
            return NaturalLanguageResponse.model_validate(restore_sensitive_data(result.model_dump()))
