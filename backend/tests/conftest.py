import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.dependencies import get_db
from app.main import app
from app.core.config import SETTINGS


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
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    object.__setattr__(SETTINGS, "jwt_secret_key", "test-only-secret-key-with-enough-entropy")
    try:
        with TestClient(app) as test_client:
            response = test_client.post("/auth/register", json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "test-password",
                "password_confirmation": "test-password",
            })
            assert response.status_code == 201
            db_session.info["user_id"] = response.json()["id"]
            yield test_client
    finally:
        app.dependency_overrides.clear()
