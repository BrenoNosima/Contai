import logging
import os
from sqlalchemy import text
from app.core.config import SETTINGS
from app.core.database import SessionLocal
from app.maintenance.lifecycle import maintenance_lifespan
from uuid import uuid4
from app.core.request_context import request_id
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.core.config import CORS_ORIGINS
from app.core.dependencies import get_password_compliant_user
from app.core.web_security import add_security_headers, enforce_rate_limit, https_redirect_url, validate_csrf_request
from app.api.routes.auth import router as auth_router
from app.core.exceptions import (
    DomainValidationError,
    PersistenceConflictError,
    PersistenceUnavailableError,
)

from app.api.routes.transactions import (
    router as transactions_router,
)

from app.api.routes.goals import (
    router as goals_router,
)

from app.api.routes.fixed_expenses import (
    router as fixed_expenses_router,
)

from app.api.routes.dashboard import (
    router as dashboard_router,
)

from app.api.routes.chat import (
    router as chat_router,
)

from app.api.routes.reports import (
    router as reports_router,
)
from app.api.routes.metadata import router as metadata_router
from app.api.routes.assistant_actions import router as assistant_actions_router
from app.api.routes.privacy import router as privacy_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SPA_INDEX = STATIC_DIR / "index.html"
API_ROUTE_PREFIXES = {
    "assistant-actions",
    "auth",
    "chat",
    "dashboard",
    "docs",
    "fixed-expenses",
    "goals",
    "health",
    "ready",
    "version",
    "metadata",
    "openapi.json",
    "privacy",
    "redoc",
    "reports",
    "transactions",
}

app = FastAPI(
    title="Contaí",
    description="Sistema financeiro pessoal com IA",
    version="0.1.0",
    lifespan=maintenance_lifespan,
    docs_url=None if SETTINGS.environment == "production" else "/docs",
    redoc_url=None if SETTINGS.environment == "production" else "/redoc",
    openapi_url=None if SETTINGS.environment == "production" else "/openapi.json",
)


async def correlate_request(request: Request, call_next):
    identifier = uuid4().hex
    token = request_id.set(identifier)
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = identifier
        return response
    finally:
        request_id.reset(token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Requested-With", "X-CSRF-Token"],
    expose_headers=["X-Request-ID", "Retry-After"],
)


@app.middleware("http")
async def application_security(request: Request, call_next):
    redirect_url = https_redirect_url(request)
    if redirect_url:
        response = RedirectResponse(redirect_url, status_code=307)
        add_security_headers(response)
        return response
    try:
        await run_in_threadpool(enforce_rate_limit, request)
        validate_csrf_request(request)
    except HTTPException as error:
        response = JSONResponse(
            status_code=error.status_code,
            content={"detail": error.detail},
            headers=error.headers,
        )
        add_security_headers(response)
        return response
    response = await call_next(request)
    add_security_headers(response)
    if response.status_code == 200 and request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif response.headers.get("content-type", "").startswith("text/html"):
        response.headers["Cache-Control"] = "no-cache"
    else:
        response.headers["Cache-Control"] = "no-store"
    return response

# Keep correlation outside security middleware, including early 429/403 responses.
app.middleware("http")(correlate_request)

# Rotas
app.include_router(auth_router)
app.include_router(privacy_router)
private_dependencies = [Depends(get_password_compliant_user)]
app.include_router(transactions_router, dependencies=private_dependencies)
app.include_router(goals_router, dependencies=private_dependencies)
app.include_router(fixed_expenses_router, dependencies=private_dependencies)
app.include_router(dashboard_router, dependencies=private_dependencies)
app.include_router(chat_router, dependencies=private_dependencies)
app.include_router(reports_router, dependencies=private_dependencies)
app.include_router(metadata_router, dependencies=private_dependencies)
app.include_router(assistant_actions_router, dependencies=private_dependencies)


@app.exception_handler(DomainValidationError)
def domain_validation_handler(
    request: Request,
    error: DomainValidationError,
) -> JSONResponse:
    logger.info(
        "Regra de negócio rejeitada em %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(status_code=422, content={"detail": str(error)})


@app.exception_handler(PersistenceConflictError)
def persistence_conflict_handler(
    request: Request,
    error: PersistenceConflictError,
) -> JSONResponse:
    logger.warning(
        "Conflito de persistência em %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(status_code=409, content={"detail": str(error)})


@app.exception_handler(PersistenceUnavailableError)
def persistence_unavailable_handler(
    request: Request,
    error: PersistenceUnavailableError,
) -> JSONResponse:
    logger.error(
        "Falha de persistência em %s %s",
        request.method,
        request.url.path,
        exc_info=(type(error), error, error.__traceback__),
    )
    return JSONResponse(
        status_code=503,
        content={"detail": "Banco de dados temporariamente indisponível."},
    )


@app.get("/")
def root():
    if SPA_INDEX.is_file():
        return FileResponse(SPA_INDEX)
    return {
        "status": "online",
        "project": "Contaí",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/ready")
def readiness():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as error:
        logger.warning("readiness_failed error_type=%s", type(error).__name__)
        raise HTTPException(503, "Serviço temporariamente indisponível.") from error


@app.get("/version")
def deployed_version():
    return {"commit": os.environ.get("RENDER_GIT_COMMIT", "unknown")[:12]}


@app.get("/{path:path}", include_in_schema=False)
def serve_spa(path: str):
    """Serve Vite assets and let React Router handle client-side routes."""
    first_segment = path.partition("/")[0]
    if first_segment in API_ROUTE_PREFIXES:
        raise HTTPException(status_code=404, detail="Endpoint nao encontrado.")

    requested_file = (STATIC_DIR / path).resolve()
    if STATIC_DIR.resolve() in requested_file.parents and requested_file.is_file():
        return FileResponse(requested_file, media_type="application/manifest+json" if requested_file.suffix == ".webmanifest" else None)
    if requested_file.suffix in {".js", ".css", ".png", ".svg", ".ico", ".woff2", ".webmanifest"}:
        raise HTTPException(404, "Arquivo não encontrado.")
    if SPA_INDEX.is_file():
        return FileResponse(SPA_INDEX)
    raise HTTPException(status_code=404, detail="Frontend nao compilado.")
