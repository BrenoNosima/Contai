import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Tests must not inherit production cookie/CORS settings from a developer .env.
os.environ["ENVIRONMENT"] = "testing"
os.environ["COOKIE_SECURE"] = "false"
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000"

from app.core.database import Base
from app.core.dependencies import get_db
from app.main import app
from app.core.config import SETTINGS
from app.core.web_security import RATE_LIMITER


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(engine)

    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def client(db_session):
    RATE_LIMITER.clear()
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    object.__setattr__(SETTINGS, "jwt_secret_key", "test-only-secret-key-with-enough-entropy")
    try:
        with TestClient(app) as test_client:
            csrf_response = test_client.get("/auth/csrf")
            csrf_token = csrf_response.json()["csrf_token"]
            test_client.headers.update({
                "X-CSRF-Token": csrf_token,
                "Content-Type": "application/json",
            })
            response = test_client.post("/auth/register", json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "test-password-secure",
                "password_confirmation": "test-password-secure",
            })
            assert response.status_code == 201
            db_session.info["user_id"] = response.json()["id"]
            yield test_client
    finally:
        app.dependency_overrides.clear()
