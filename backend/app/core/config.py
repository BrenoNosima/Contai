import os
from collections.abc import Mapping
from dataclasses import dataclass

from dotenv import load_dotenv


DEFAULT_DATABASE_URL = (
    "postgresql+psycopg://breno:breno@localhost:5432/breno_finance"
)
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)


@dataclass(frozen=True)
class Settings:
    database_url: str
    groq_api_key: str
    groq_model: str
    cors_origins: tuple[str, ...]

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "Settings":
        database_url = values.get("DATABASE_URL", DEFAULT_DATABASE_URL).strip()
        groq_api_key = values.get("GROQ_API_KEY", "").strip()
        groq_model = values.get("GROQ_MODEL", "openai/gpt-oss-20b").strip()
        cors_origins = _parse_cors_origins(values.get("CORS_ORIGINS"))

        if not database_url or "://" not in database_url:
            raise ValueError("DATABASE_URL deve ser uma URL SQLAlchemy válida.")
        if not groq_model:
            raise ValueError("GROQ_MODEL não pode ser vazio.")

        return cls(
            database_url=database_url,
            groq_api_key=groq_api_key,
            groq_model=groq_model,
            cors_origins=cors_origins,
        )

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key)


def _parse_cors_origins(raw: str | None) -> tuple[str, ...]:
    origins = (
        tuple(origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip())
        if raw is not None
        else DEFAULT_CORS_ORIGINS
    )
    if not origins:
        raise ValueError("CORS_ORIGINS deve conter ao menos uma origem.")
    if any(not origin.startswith(("http://", "https://")) for origin in origins):
        raise ValueError("CORS_ORIGINS aceita apenas origens HTTP ou HTTPS explícitas.")
    return origins


load_dotenv()
SETTINGS = Settings.from_mapping(os.environ)

# Compatibilidade com os imports existentes. Novos consumidores podem usar SETTINGS.
DATABASE_URL = SETTINGS.database_url
GROQ_API_KEY = SETTINGS.groq_api_key
GROQ_MODEL = SETTINGS.groq_model
CORS_ORIGINS = list(SETTINGS.cors_origins)
