from langchain_core.prompts import ChatPromptTemplate

from app.agents.llm import create_chat_model
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

    def extract(self, text: str) -> dict:
        result: NaturalLanguageResponse = self.chain.invoke({"text": text})
        return result.model_dump()
