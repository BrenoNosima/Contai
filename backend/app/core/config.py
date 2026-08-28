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
DEFAULT_AI_TIMEOUT_SECONDS = 30
DEFAULT_AI_MAX_RETRIES = 1
DEFAULT_JWT_EXPIRE_MINUTES = 10 * 24 * 60
DEFAULT_REFRESH_EXPIRE_DAYS = 10


@dataclass(frozen=True)
class Settings:
    database_url: str
    groq_api_key: str
    groq_model: str
    cors_origins: tuple[str, ...]
    ai_timeout_seconds: int
    ai_max_retries: int
    jwt_secret_key: str
    jwt_expire_minutes: int
    cookie_secure: bool
    refresh_expire_days: int

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "Settings":
        database_url = values.get("DATABASE_URL", DEFAULT_DATABASE_URL).strip()
        groq_api_key = values.get("GROQ_API_KEY", "").strip()
        groq_model = values.get("GROQ_MODEL", "openai/gpt-oss-20b").strip()
        cors_origins = _parse_cors_origins(values.get("CORS_ORIGINS"))
        ai_timeout_seconds = _parse_int(
            values.get("AI_TIMEOUT_SECONDS"),
            default=DEFAULT_AI_TIMEOUT_SECONDS,
            name="AI_TIMEOUT_SECONDS",
            minimum=1,
            maximum=120,
        )
        ai_max_retries = _parse_int(
            values.get("AI_MAX_RETRIES"),
            default=DEFAULT_AI_MAX_RETRIES,
            name="AI_MAX_RETRIES",
            minimum=0,
            maximum=5,
        )
        jwt_secret_key = values.get("JWT_SECRET_KEY", "").strip()
        jwt_expire_minutes = _parse_int(
            values.get("JWT_EXPIRE_MINUTES"), default=DEFAULT_JWT_EXPIRE_MINUTES,
            name="JWT_EXPIRE_MINUTES", minimum=5, maximum=43200,
        )
        secure_default = "true" if values.get("ENVIRONMENT", "development").strip().lower() == "production" else "false"
        cookie_secure = values.get("COOKIE_SECURE", secure_default).strip().lower() in {
            "1", "true", "yes", "on",
        }
        refresh_expire_days = _parse_int(
            values.get("REFRESH_EXPIRE_DAYS"), default=DEFAULT_REFRESH_EXPIRE_DAYS,
            name="REFRESH_EXPIRE_DAYS", minimum=1, maximum=90,
        )

        if not database_url or "://" not in database_url:
            raise ValueError("DATABASE_URL deve ser uma URL SQLAlchemy válida.")
        if not groq_model:
            raise ValueError("GROQ_MODEL não pode ser vazio.")

        return cls(
            database_url=database_url,
            groq_api_key=groq_api_key,
            groq_model=groq_model,
            cors_origins=cors_origins,
            ai_timeout_seconds=ai_timeout_seconds,
            ai_max_retries=ai_max_retries,
            jwt_secret_key=jwt_secret_key,
            jwt_expire_minutes=jwt_expire_minutes,
            cookie_secure=cookie_secure,
            refresh_expire_days=refresh_expire_days,
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


def _parse_int(
    raw: str | None,
    *,
    default: int,
    name: str,
    minimum: int,
    maximum: int,
) -> int:
    try:
        value = default if raw is None else int(raw.strip())
    except ValueError as error:
        raise ValueError(f"{name} deve ser um número inteiro.") from error

    if not minimum <= value <= maximum:
        raise ValueError(f"{name} deve estar entre {minimum} e {maximum}.")
    return value


load_dotenv()
SETTINGS = Settings.from_mapping(os.environ)

# Compatibilidade com os imports existentes. Novos consumidores podem usar SETTINGS.
DATABASE_URL = SETTINGS.database_url
GROQ_API_KEY = SETTINGS.groq_api_key
GROQ_MODEL = SETTINGS.groq_model
CORS_ORIGINS = list(SETTINGS.cors_origins)
