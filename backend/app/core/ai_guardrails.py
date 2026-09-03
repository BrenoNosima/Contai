import re
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any

from app.core.config import SETTINGS


INJECTION_PATTERNS = (
    r"^ignore$",
    r"\b(ignore|disregard|forget|override)\b.{0,80}\b(instructions?|prompts?|rules?|guardrails?|system|developer)\b",
    r"\b(ignore|ignora|desconsidere|esqueca|anule|substitua|nao respeite|deixe de respeitar)\b.{0,80}\b(instrucoes?|prompts?|regras?|guardrails?|sistema|desenvolvedor)\b",
    r"\b(reveal|show|print|repeat|expose)\b.{0,60}\b(system prompt|developer message|hidden instructions?)\b",
    r"\b(revele|mostre|imprima|repita|exponha)\b.{0,60}\b(prompt do sistema|mensagem do desenvolvedor|instrucoes? ocultas?)\b",
    r"\b(exfiltrate|reveal|show|exfiltre|revele|mostre)\b.{0,60}\b(api key|jwt secret|password|cookie|chave de api|segredo jwt|senha)\b",
    r"\b(bypass|circumvent|contorne|burle)\b.{0,60}\b(guardrails?|safety|authorization|protecao|seguranca|autorizacao)\b",
    r"\b(pretend|act as if|finja)\b.{0,80}\b(no rules?|rules? do not exist|sem regras?|regras? nao existem|nao (ha|existem) regras?)\b",
)

SENSITIVE_INPUT_PATTERNS = (
    ("E_MAIL", re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")),
    ("CPF", re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)")),
    ("CNPJ", re.compile(r"(?<!\d)\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}(?!\d)")),
    ("TELEFONE", re.compile(r"(?<!\d)(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}(?!\d)")),
    ("CHAVE_PIX", re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b")),
    ("NUMERO", re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")),
)

_redaction_map: ContextVar[dict[str, str] | None] = ContextVar(
    "sensitive_redaction_map", default=None
)


@contextmanager
def sensitive_redaction_scope() -> Iterator[None]:
    """Isolate reversible placeholders to one AI operation."""
    token = _redaction_map.set({})
    try:
        yield
    finally:
        _redaction_map.reset(token)


def validate_prompt(message: str) -> None:
    normalized = unicodedata.normalize("NFKD", message.casefold())
    normalized = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized).strip()
    if any(re.search(pattern, normalized) for pattern in INJECTION_PATTERNS):
        raise ValueError("A mensagem contém uma tentativa de alterar ou revelar instruções protegidas.")


def redact_sensitive_input(content: str) -> str:
    result = content
    replacements = _redaction_map.get()
    sequence = len(replacements) if replacements is not None else 0
    for label, pattern in SENSITIVE_INPUT_PATTERNS:
        def replace(match: re.Match[str]) -> str:
            nonlocal sequence
            sequence += 1
            placeholder = f"[DADO_SENSIVEL_{label}_{sequence}]"
            if replacements is not None:
                replacements[placeholder] = match.group(0)
            return placeholder

        result = pattern.sub(replace, result)
    return result


def redact_for_ai(value: Any) -> Any:
    """Return an AI-safe copy without mutating ORM entities or stored data."""
    if isinstance(value, str):
        return redact_sensitive_input(value)
    if isinstance(value, dict):
        return {key: redact_for_ai(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_for_ai(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_for_ai(item) for item in value)
    return value


def restore_sensitive_data(value: Any) -> Any:
    replacements = _redaction_map.get() or {}
    if isinstance(value, str):
        result = value
        for placeholder, original in replacements.items():
            result = result.replace(placeholder, original)
        return result
    if isinstance(value, dict):
        return {key: restore_sensitive_data(item) for key, item in value.items()}
    if isinstance(value, list):
        return [restore_sensitive_data(item) for item in value]
    if isinstance(value, tuple):
        return tuple(restore_sensitive_data(item) for item in value)
    return value


def sanitize_model_output(content: str) -> str:
    secrets = (
        SETTINGS.groq_api_key,
        SETTINGS.jwt_secret_key,
        SETTINGS.jwt_previous_secret_key,
        SETTINGS.jwt_next_secret_key,
    )
    result = content
    for secret in secrets:
        if secret and secret in result:
            result = result.replace(secret, "[SEGREDO REMOVIDO]")
    return result
