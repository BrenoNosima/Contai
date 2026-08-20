from app.main import health_check


def test_health_check():
    assert health_check() == {"status": "healthy"}


def test_cors_allows_configured_frontend(client):
    response = client.options(
        "/chat/",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-credentials" not in response.headers


def test_cors_rejects_unconfigured_origin(client):
    response = client.options(
        "/chat/",
        headers={
            "Origin": "https://untrusted.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
