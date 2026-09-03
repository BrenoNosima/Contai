from app.core.config import SETTINGS
from app.core.security import create_access_token, decode_access_token
from app.core.password_policy import validate_password_strength
import pytest


def test_private_routes_require_authentication(client):
    client.post("/auth/logout")
    response = client.get("/transactions/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Autenticação necessária."


def test_register_login_me_and_logout(client):
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"
    assert "password_hash" not in me.json()

    assert client.post("/auth/logout").status_code == 204
    assert client.get("/auth/me").status_code == 401
    login = client.post("/auth/login", json={"email": "test@example.com", "password": "Test-password1!"})
    assert login.status_code == 200
    cookie = login.cookies.get("access_token")
    assert cookie and decode_access_token(cookie)[0] == login.json()["id"]

def test_invalid_credentials_and_duplicate_email(client):
    invalid = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert invalid.status_code == 401
    duplicate = client.post("/auth/register", json={
        "name": "Duplicate", "email": "TEST@example.com", "password": "Password-123!",
        "password_confirmation": "Password-123!",
    })
    assert duplicate.status_code == 409


def test_previous_jwt_key_remains_valid_during_rotation():
    original_current = SETTINGS.jwt_secret_key
    original_previous = SETTINGS.jwt_previous_secret_key
    old_key = "old-test-signing-key-with-enough-entropy"
    new_key = "new-test-signing-key-with-enough-entropy"
    try:
        object.__setattr__(SETTINGS, "jwt_secret_key", old_key)
        token = create_access_token(42, "rotation-session")
        object.__setattr__(SETTINGS, "jwt_secret_key", new_key)
        object.__setattr__(SETTINGS, "jwt_previous_secret_key", old_key)

        assert decode_access_token(token) == (42, "rotation-session")
    finally:
        object.__setattr__(SETTINGS, "jwt_secret_key", original_current)
        object.__setattr__(SETTINGS, "jwt_previous_secret_key", original_previous)


def test_next_jwt_key_is_accepted_before_rotation_cutover():
    original_current = SETTINGS.jwt_secret_key
    original_next = SETTINGS.jwt_next_secret_key
    old_key = "old-test-signing-key-with-enough-entropy"
    new_key = "new-test-signing-key-with-enough-entropy"
    try:
        object.__setattr__(SETTINGS, "jwt_secret_key", new_key)
        token = create_access_token(42, "next-rotation-session")
        object.__setattr__(SETTINGS, "jwt_secret_key", old_key)
        object.__setattr__(SETTINGS, "jwt_next_secret_key", new_key)

        assert decode_access_token(token) == (42, "next-rotation-session")
    finally:
        object.__setattr__(SETTINGS, "jwt_secret_key", original_current)
        object.__setattr__(SETTINGS, "jwt_next_secret_key", original_next)


def test_registration_requires_every_password_character_class(client):
    accepted = client.post("/auth/register", json={
        "name": "Strong Password", "email": "strong@example.com", "password": "Abcdef1!",
        "password_confirmation": "Abcdef1!",
    })
    assert accepted.status_code == 201

    rejected = client.post("/auth/register", json={
        "name": "Weak Password", "email": "weak@example.com", "password": "abcdefgh!",
        "password_confirmation": "abcdefgh!",
    })
    assert rejected.status_code == 422
    for weak in ("ABCDEFGH1!", "Abcdefgh!", "Abcdefg1", "Ab1!", "Abc def1!"):
        with pytest.raises(ValueError):
            validate_password_strength(weak)


def test_users_cannot_access_each_others_data(client, db_session):
    created = client.post("/transactions/", json={
        "type": "expense", "description": "Privado", "category": "Outros",
        "amount": 10, "due_date": "2026-08-27", "status": "paid", "is_recurring": False,
    })
    assert created.status_code == 200
    first_user_id = created.json()["user_id"]
    assert client.post("/goals/", json={"name": "Reserva", "target_amount": 500}).status_code == 200
    assert client.post("/fixed-expenses/", json={
        "name": "Internet", "category": "Moradia", "amount": 100, "billing_day": 10,
    }).status_code == 200

    client.post("/auth/logout")
    second = client.post("/auth/register", json={
        "name": "Second User", "email": "second@example.com", "password": "Password-123!",
        "password_confirmation": "Password-123!",
    })
    assert second.status_code == 201
    assert second.json()["id"] != first_user_id
    assert client.get("/transactions/").json() == []
    assert client.get("/goals/").json() == []
    assert client.get("/fixed-expenses/").json() == []
    assert client.get(f"/transactions/{created.json()['id']}").status_code == 404


def test_user_can_correct_export_and_delete_all_account_data(client, db_session):
    created = client.post("/transactions/", json={
        "type": "expense", "description": "Dado exportável", "category": "Outros",
        "amount": 42, "due_date": "2026-09-03", "status": "paid", "is_recurring": False,
    })
    assert created.status_code == 200

    updated = client.patch("/auth/me", json={
        "name": "Nome Corrigido", "email": "corrigido@example.com", "password": "Test-password1!",
    })
    assert updated.status_code == 200
    assert updated.json()["name"] == "Nome Corrigido"

    exported = client.get("/auth/me/export")
    assert exported.status_code == 200
    body = exported.json()
    assert body["user"]["email"] == "corrigido@example.com"
    assert body["transactions"][0]["description"] == "Dado exportável"
    assert "password_hash" not in str(body)
    assert "refresh_token_hash" not in str(body)

    deleted = client.request("DELETE", "/auth/me", json={
        "password": "Test-password1!", "confirmation": "EXCLUIR MINHA CONTA",
    })
    assert deleted.status_code == 204
    assert client.get("/auth/me").status_code == 401
    assert db_session.execute(__import__("sqlalchemy").text("SELECT count(*) FROM users WHERE email = 'corrigido@example.com'")).scalar() == 0


def test_account_deletion_requires_password_and_exact_confirmation(client):
    wrong_confirmation = client.request("DELETE", "/auth/me", json={
        "password": "Test-password1!", "confirmation": "excluir",
    })
    assert wrong_confirmation.status_code == 422
    wrong_password = client.request("DELETE", "/auth/me", json={
        "password": "senha-incorreta", "confirmation": "EXCLUIR MINHA CONTA",
    })
    assert wrong_password.status_code == 400
    assert client.get("/auth/me").status_code == 200


def test_privacy_notice_is_public(client):
    client.post("/auth/logout")
    response = client.get("/privacy")
    assert response.status_code == 200
    assert response.json()["ai_provider"] == "Groq"


def test_existing_user_is_forced_to_change_password_before_financial_access(client, db_session):
    from app.models.user import User

    user = db_session.query(User).filter(User.email == "test@example.com").one()
    user.must_change_password = True
    db_session.commit()

    assert client.get("/auth/me").json()["must_change_password"] is True
    blocked = client.get("/transactions/")
    assert blocked.status_code == 403
    assert "Troque sua senha" in blocked.json()["detail"]

    changed = client.post("/auth/change-password", json={
        "current_password": "Test-password1!",
        "new_password": "New-password2@",
        "new_password_confirmation": "New-password2@",
    })
    assert changed.status_code == 204
    assert client.get("/auth/me").status_code == 401

    login = client.post("/auth/login", json={"email": "test@example.com", "password": "New-password2@"})
    assert login.status_code == 200
    assert login.json()["must_change_password"] is False
    assert client.get("/transactions/").status_code == 200
