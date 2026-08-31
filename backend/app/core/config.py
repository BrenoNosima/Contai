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
    environment: str
    database_url: str
    groq_api_key: str
    groq_model: str
    cors_origins: tuple[str, ...]
    ai_timeout_seconds: int
    ai_max_retries: int
    jwt_secret_key: str
    jwt_previous_secret_key: str
    jwt_next_secret_key: str
    jwt_expire_minutes: int
    cookie_secure: bool
    enforce_https: bool
    refresh_expire_days: int

    @classmethod
    def from_mapping(cls, values: Mapping[str, str]) -> "Settings":
        environment = values.get("ENVIRONMENT", "development").strip().lower()
        raw_database_url = values.get("DATABASE_URL", DEFAULT_DATABASE_URL).strip()
        database_url = _normalize_database_url(raw_database_url)
        if environment == "production":
            if database_url == DEFAULT_DATABASE_URL or not database_url.startswith("postgresql+psycopg://"):
                raise ValueError("DATABASE_URL de produção deve apontar para um PostgreSQL privado.")
            database_url = _require_database_tls(database_url)
        groq_api_key = values.get("GROQ_API_KEY", "").strip()
        groq_model = values.get("GROQ_MODEL", "openai/gpt-oss-20b").strip()
        cors_origins = _parse_cors_origins(
            values.get("CORS_ORIGINS"), allow_empty=environment == "production"
        )
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
        jwt_previous_secret_key = values.get("JWT_PREVIOUS_SECRET_KEY", "").strip()
        jwt_next_secret_key = values.get("JWT_NEXT_SECRET_KEY", "").strip()
        jwt_expire_minutes = _parse_int(
            values.get("JWT_EXPIRE_MINUTES"), default=DEFAULT_JWT_EXPIRE_MINUTES,
            name="JWT_EXPIRE_MINUTES", minimum=5, maximum=43200,
        )
        secure_default = "true" if environment == "production" else "false"
        cookie_secure = values.get("COOKIE_SECURE", secure_default).strip().lower() in {
            "1", "true", "yes", "on",
        }
        https_default = "true" if environment == "production" else "false"
        enforce_https = values.get("ENFORCE_HTTPS", https_default).strip().lower() in {
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
        if environment == "production":
            if len(jwt_secret_key) < 32 or jwt_secret_key.startswith("replace-"):
                raise ValueError("JWT_SECRET_KEY de produção deve ser aleatória e ter ao menos 32 caracteres.")
            if not cookie_secure:
                raise ValueError("COOKIE_SECURE deve estar ativo em produção.")
            if not enforce_https:
                raise ValueError("ENFORCE_HTTPS deve estar ativo em produção.")
            if jwt_previous_secret_key and (
                len(jwt_previous_secret_key) < 32
                or jwt_previous_secret_key.startswith("replace-")
                or jwt_previous_secret_key == jwt_secret_key
            ):
                raise ValueError("JWT_PREVIOUS_SECRET_KEY deve ser diferente e ter ao menos 32 caracteres.")
            if jwt_next_secret_key and (
                len(jwt_next_secret_key) < 32
                or jwt_next_secret_key.startswith("replace-")
                or jwt_next_secret_key in {jwt_secret_key, jwt_previous_secret_key}
            ):
                raise ValueError("JWT_NEXT_SECRET_KEY deve ser diferente e ter ao menos 32 caracteres.")
            if any("localhost" in origin or "127.0.0.1" in origin for origin in cors_origins):
                raise ValueError("CORS_ORIGINS de produção não pode conter endereços locais.")

        return cls(
            environment=environment,
            database_url=database_url,
            groq_api_key=groq_api_key,
            groq_model=groq_model,
            cors_origins=cors_origins,
            ai_timeout_seconds=ai_timeout_seconds,
            ai_max_retries=ai_max_retries,
            jwt_secret_key=jwt_secret_key,
            jwt_previous_secret_key=jwt_previous_secret_key,
            jwt_next_secret_key=jwt_next_secret_key,
            jwt_expire_minutes=jwt_expire_minutes,
            cookie_secure=cookie_secure,
            enforce_https=enforce_https,
            refresh_expire_days=refresh_expire_days,
        )

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key)


def _parse_cors_origins(raw: str | None, *, allow_empty: bool = False) -> tuple[str, ...]:
    if raw is None and allow_empty:
        return ()
    origins = (
        tuple(origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip())
        if raw is not None
        else DEFAULT_CORS_ORIGINS
    )
    if not origins and not allow_empty:
        raise ValueError("CORS_ORIGINS deve conter ao menos uma origem.")
    if any(not origin.startswith(("http://", "https://")) for origin in origins):
        raise ValueError("CORS_ORIGINS aceita apenas origens HTTP ou HTTPS explícitas.")
    return origins


def _normalize_database_url(url: str) -> str:
    """Use the installed psycopg 3 driver with provider-style PostgreSQL URLs."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


def _require_database_tls(url: str) -> str:
    """Force encrypted PostgreSQL transport in production."""
    if not url.startswith("postgresql+psycopg://"):
        return url
    separator = "&" if "?" in url else "?"
    if "sslmode=" not in url.lower():
        return f"{url}{separator}sslmode=require"
    sslmode = next(
        (part.split("=", 1)[1].lower() for part in url.split("?", 1)[1].split("&") if part.lower().startswith("sslmode=")),
        "",
    )
    if sslmode not in {"require", "verify-ca", "verify-full"}:
        raise ValueError("DATABASE_URL de produção deve exigir TLS com sslmode=require ou mais forte.")
    return url


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
