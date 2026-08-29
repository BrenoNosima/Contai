from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse

import app.main as main_module
from app.main import health_check


def test_health_check():
    assert health_check() == {"status": "healthy"}


def test_spa_fallback_serves_index(monkeypatch, tmp_path: Path):
    index = tmp_path / "index.html"
    index.write_text("<html>Contaí</html>", encoding="utf-8")
    monkeypatch.setattr(main_module, "STATIC_DIR", tmp_path)
    monkeypatch.setattr(main_module, "SPA_INDEX", index)

    response = main_module.serve_spa("login")

    assert isinstance(response, FileResponse)
    assert Path(response.path) == index


def test_spa_serves_compiled_asset(monkeypatch, tmp_path: Path):
    asset = tmp_path / "assets" / "app.js"
    asset.parent.mkdir()
    asset.write_text("console.log('ok')", encoding="utf-8")
    monkeypatch.setattr(main_module, "STATIC_DIR", tmp_path)
    monkeypatch.setattr(main_module, "SPA_INDEX", tmp_path / "index.html")

    response = main_module.serve_spa("assets/app.js")

    assert isinstance(response, FileResponse)
    assert Path(response.path) == asset


def test_spa_does_not_hide_unknown_api_route(monkeypatch, tmp_path: Path):
    index = tmp_path / "index.html"
    index.write_text("<html></html>", encoding="utf-8")
    monkeypatch.setattr(main_module, "STATIC_DIR", tmp_path)
    monkeypatch.setattr(main_module, "SPA_INDEX", index)

    with pytest.raises(HTTPException) as error:
        main_module.serve_spa("transactions/not-a-route")

    assert error.value.status_code == 404


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
    assert response.headers["access-control-allow-credentials"] == "true"


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
