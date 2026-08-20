import pytest

from app.core.config import (
    DEFAULT_CORS_ORIGINS,
    DEFAULT_DATABASE_URL,
    Settings,
)


def test_settings_use_safe_local_defaults():
    settings = Settings.from_mapping({})

    assert settings.database_url == DEFAULT_DATABASE_URL
    assert settings.cors_origins == DEFAULT_CORS_ORIGINS
    assert settings.groq_configured is False


def test_settings_normalize_environment_values():
    settings = Settings.from_mapping(
        {
            "DATABASE_URL": " sqlite:///:memory: ",
            "GROQ_API_KEY": " secret ",
            "GROQ_MODEL": " model-name ",
            "CORS_ORIGINS": "https://app.example.com/, http://localhost:3000",
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


@pytest.mark.parametrize(
    ("values", "message"),
    [
        ({"DATABASE_URL": "localhost/db"}, "DATABASE_URL"),
        ({"GROQ_MODEL": " "}, "GROQ_MODEL"),
        ({"CORS_ORIGINS": ""}, "CORS_ORIGINS"),
        ({"CORS_ORIGINS": "*"}, "CORS_ORIGINS"),
    ],
)
def test_settings_reject_invalid_values(values, message):
    with pytest.raises(ValueError, match=message):
        Settings.from_mapping(values)
