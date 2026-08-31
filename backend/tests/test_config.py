import pytest

from app.core.config import (
    DEFAULT_AI_MAX_RETRIES,
    DEFAULT_AI_TIMEOUT_SECONDS,
    DEFAULT_CORS_ORIGINS,
    DEFAULT_DATABASE_URL,
    DEFAULT_JWT_EXPIRE_MINUTES,
    DEFAULT_REFRESH_EXPIRE_DAYS,
    Settings,
)


def test_settings_use_safe_local_defaults():
    settings = Settings.from_mapping({})

    assert settings.database_url == DEFAULT_DATABASE_URL
    assert settings.environment == "development"
    assert settings.enforce_https is False
    assert settings.cors_origins == DEFAULT_CORS_ORIGINS
    assert settings.groq_configured is False
    assert settings.ai_timeout_seconds == DEFAULT_AI_TIMEOUT_SECONDS
    assert settings.ai_max_retries == DEFAULT_AI_MAX_RETRIES
    assert settings.jwt_expire_minutes == DEFAULT_JWT_EXPIRE_MINUTES == 14400
    assert settings.refresh_expire_days == DEFAULT_REFRESH_EXPIRE_DAYS == 10


def test_settings_normalize_environment_values():
    settings = Settings.from_mapping(
        {
            "DATABASE_URL": " sqlite:///:memory: ",
            "GROQ_API_KEY": " secret ",
            "GROQ_MODEL": " model-name ",
            "CORS_ORIGINS": "https://app.example.com/, http://localhost:3000",
            "AI_TIMEOUT_SECONDS": " 45 ",
            "AI_MAX_RETRIES": "2",
        }
    )

    assert settings.database_url == "sqlite:///:memory:"
    assert settings.groq_api_key == "secret"
    assert settings.groq_model == "model-name"
    assert settings.cors_origins == (
        "https://app.example.com",
        "http://localhost:3000",
    )
    assert settings.groq_configured is True
    assert settings.ai_timeout_seconds == 45
    assert settings.ai_max_retries == 2


def test_settings_accept_hardened_production_configuration():
    settings = Settings.from_mapping({
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql+psycopg://user:password@private-db:5432/finance",
        "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
        "CORS_ORIGINS": "https://app.example.com",
    })

    assert settings.cookie_secure is True
    assert settings.enforce_https is True
    assert settings.database_url.endswith("?sslmode=require")
    assert settings.cors_origins == ("https://app.example.com",)


def test_settings_accept_same_origin_production_without_cors():
    settings = Settings.from_mapping({
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql://user:password@private-db:5432/finance",
        "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
        "CORS_ORIGINS": "",
    })

    assert settings.cors_origins == ()
    assert settings.database_url.endswith("?sslmode=require")


def test_settings_accept_same_origin_production_without_cors_variable():
    settings = Settings.from_mapping({
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql://user:password@private-db:5432/finance",
        "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
    })

    assert settings.cors_origins == ()


@pytest.mark.parametrize("scheme", ["postgres://", "postgresql://"])
def test_settings_select_psycopg3_for_provider_database_urls(scheme):
    settings = Settings.from_mapping({
        "DATABASE_URL": f"{scheme}user:password@db.example.com/finance?sslmode=require",
    })

    assert settings.database_url == (
        "postgresql+psycopg://user:password@db.example.com/finance?sslmode=require"
    )


@pytest.mark.parametrize(
    ("values", "message"),
    [
        ({"DATABASE_URL": "localhost/db"}, "DATABASE_URL"),
        ({"GROQ_MODEL": " "}, "GROQ_MODEL"),
        ({"CORS_ORIGINS": ""}, "CORS_ORIGINS"),
        ({"CORS_ORIGINS": "*"}, "CORS_ORIGINS"),
        ({"AI_TIMEOUT_SECONDS": "0"}, "AI_TIMEOUT_SECONDS"),
        ({"AI_TIMEOUT_SECONDS": "slow"}, "AI_TIMEOUT_SECONDS"),
        ({"AI_MAX_RETRIES": "6"}, "AI_MAX_RETRIES"),
        ({"ENVIRONMENT": "production"}, "DATABASE_URL"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
        }, "JWT_SECRET_KEY"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
            "COOKIE_SECURE": "false",
        }, "COOKIE_SECURE"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
            "CORS_ORIGINS": "http://localhost:3000",
        }, "CORS_ORIGINS"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance?sslmode=disable",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
        }, "sslmode"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
            "ENFORCE_HTTPS": "false",
        }, "ENFORCE_HTTPS"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
            "JWT_PREVIOUS_SECRET_KEY": "short",
        }, "JWT_PREVIOUS_SECRET_KEY"),
        ({
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql+psycopg://user:password@db:5432/finance",
            "JWT_SECRET_KEY": "a-production-secret-with-enough-entropy",
            "JWT_NEXT_SECRET_KEY": "short",
        }, "JWT_NEXT_SECRET_KEY"),
    ],
)
def test_settings_reject_invalid_values(values, message):
    with pytest.raises(ValueError, match=message):
        Settings.from_mapping(values)
