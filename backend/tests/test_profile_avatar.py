from app.models.user import User


def test_avatar_is_saved_and_returned_with_profile_and_export(client, db_session):
    assert client.get("/auth/me").json()["avatar_id"] == "person"
    other = User(name="Other", email="other-avatar@example.com", password_hash="unused")
    db_session.add(other)
    db_session.commit()
    result = client.patch("/auth/me/avatar", json={"avatar_id": "cat"})
    assert result.status_code == 200
    assert result.json()["avatar_id"] == "cat"
    assert client.get("/auth/me").json()["avatar_id"] == "cat"
    assert client.get("/auth/me/export").json()["user"]["avatar_id"] == "cat"
    db_session.refresh(other)
    assert other.avatar_id == "person"
    assert client.post("/auth/logout").status_code == 204
    result = client.post("/auth/login", json={"email": "test@example.com", "password": "Test-password1!"})
    assert result.json()["avatar_id"] == "cat"


def test_avatar_rejects_urls_unknown_choices_and_identity_fields(client):
    for payload in [{"avatar_id": "https://example.com/icon.svg"}, {"avatar_id": "unknown"},
                    {"avatar_id": "cat", "user_id": 123}, {"avatar_id": None}]:
        assert client.patch("/auth/me/avatar", json=payload).status_code == 422
    assert client.get("/auth/me").json()["avatar_id"] == "person"


def test_avatar_requires_authentication(client):
    client.post("/auth/logout")
    assert client.patch("/auth/me/avatar", json={"avatar_id": "cat"}).status_code == 401
