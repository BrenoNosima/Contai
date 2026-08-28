import pytest

from app.core.config import (
    DEFAULT_AI_MAX_RETRIES,
    DEFAULT_AI_TIMEOUT_SECONDS,
    DEFAULT_CORS_ORIGINS,
    DEFAULT_DATABASE_URL,
    DEFAULT_REFRESH_EXPIRE_DAYS,
    Settings,
)


def test_settings_use_safe_local_defaults():
    settings = Settings.from_mapping({})

    assert settings.database_url == DEFAULT_DATABASE_URL
    assert settings.cors_origins == DEFAULT_CORS_ORIGINS
    assert settings.groq_configured is False
    assert settings.ai_timeout_seconds == DEFAULT_AI_TIMEOUT_SECONDS
    assert settings.ai_max_retries == DEFAULT_AI_MAX_RETRIES
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
    ],
)
def test_settings_reject_invalid_values(values, message):
    with pytest.raises(ValueError, match=message):
        Settings.from_mapping(values)
