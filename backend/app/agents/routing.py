import re
import unicodedata


def specialist_for(message: str) -> str | None:
    """Only route complete, unambiguous requests; compound intents stay in the supervisor."""
    normalized = unicodedata.normalize("NFKD", message.casefold())
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = re.sub(r"\s+", " ", normalized).strip().rstrip(".?!").strip()
    if normalized in {
        "quanto vai sobrar no fim deste mes", "quanto vai sobrar no fim do mes",
        "quanto devo ter no fim do mes", "quanto do meu dinheiro ja esta comprometido este mes",
    }:
        return "planning"
    if normalized in {"compare este mes com o mes passado", "compare o mes atual com o mes passado"}:
        return "analysis"
    return None
