import re

from app.core.config import SETTINGS


INJECTION_PATTERNS = (
    r"ignore (all |any )?(previous|prior) instructions",
    r"(reveal|show|print|repeat).{0,30}(system prompt|developer message|hidden instructions)",
    r"(exfiltrate|reveal|show).{0,30}(api key|jwt secret|password|cookie)",
    r"bypass.{0,30}(guardrail|safety|authorization)",
)


def validate_prompt(message: str) -> None:
    normalized = " ".join(message.lower().split())
    if any(re.search(pattern, normalized) for pattern in INJECTION_PATTERNS):
        raise ValueError("A mensagem contém uma tentativa de alterar ou revelar instruções protegidas.")


def sanitize_model_output(content: str) -> str:
    secrets = (SETTINGS.groq_api_key, SETTINGS.jwt_secret_key)
    result = content
    for secret in secrets:
        if secret and secret in result:
            result = result.replace(secret, "[SEGREDO REMOVIDO]")
    return result
