import json

from langchain_groq import ChatGroq

from langchain_core.prompts import (
    ChatPromptTemplate,
)

from app.prompts.extraction_prompt import (
    EXTRACTION_PROMPT,
)

from app.core.config import (
    GROQ_API_KEY,
)


class ExtractorAgent:

    def __init__(self):

        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=str(GROQ_API_KEY),
            temperature=0,
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

        content = str(result.content)

        print("\n===== GROQ RESPONSE =====")
        print(content)
        print("=========================\n")

        content = content.replace(
            "```json",
            ""
        )

        content = content.replace(
            "```",
            ""
        )

        content = content.strip()

        return json.loads(content)