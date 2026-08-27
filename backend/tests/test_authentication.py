from app.core.security import decode_access_token


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
    login = client.post("/auth/login", json={"email": "test@example.com", "password": "test-password-secure"})
    assert login.status_code == 200
    cookie = login.cookies.get("access_token")
    assert cookie and decode_access_token(cookie)[0] == login.json()["id"]


def test_invalid_credentials_and_duplicate_email(client):
    invalid = client.post("/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert invalid.status_code == 401
    duplicate = client.post("/auth/register", json={
        "name": "Duplicate", "email": "TEST@example.com", "password": "password-123-secure",
        "password_confirmation": "password-123-secure",
    })
    assert duplicate.status_code == 409


def test_users_cannot_access_each_others_data(client, db_session):
    created = client.post("/transactions/", json={
        "type": "expense", "description": "Privado", "category": "Outros",
        "amount": 10, "due_date": "2026-08-27", "status": "paid", "is_recurring": False,
    })
    assert created.status_code == 200
    first_user_id = created.json()["user_id"]

    client.post("/auth/logout")
    second = client.post("/auth/register", json={
        "name": "Second User", "email": "second@example.com", "password": "password-123-secure",
        "password_confirmation": "password-123-secure",
    })
    assert second.status_code == 201
    assert second.json()["id"] != first_user_id
    assert client.get("/transactions/").json() == []
    assert client.get(f"/transactions/{created.json()['id']}").status_code == 404
