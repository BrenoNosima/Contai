# chain de extracao LangChain
import os
import json

from langchain_google_genai import (
    ChatGoogleGenerativeAI,
)

from langchain_core.prompts import (
    ChatPromptTemplate,
)

from app.prompts.extraction_prompt import (
    EXTRACTION_PROMPT,
)


class ExtractorAgent:

    def __init__(self):

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
            google_api_key=os.getenv(
                "GOOGLE_API_KEY"
            ),
        )

        self.prompt = ChatPromptTemplate.from_messages(
            [
                ("system", EXTRACTION_PROMPT),
                ("human", "{text}"),
            ]
        )

        self.chain = self.prompt | self.llm

    def extract(
        self,
        text: str,
    ):

        result = self.chain.invoke(
            {
                "text": text,
            }
        )

        return json.loads(
            result.content
        )