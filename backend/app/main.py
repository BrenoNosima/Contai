import logging
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.core.dependencies import get_current_user
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
    "metadata",
    "openapi.json",
    "redoc",
    "reports",
    "transactions",
}

app = FastAPI(
    title="Contaí",
    description="Sistema financeiro pessoal com IA",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Requested-With", "X-CSRF-Token"],
)


@app.middleware("http")
async def application_security(request: Request, call_next):
    redirect_url = https_redirect_url(request)
    if redirect_url:
        response = RedirectResponse(redirect_url, status_code=307)
        add_security_headers(response)
        return response
    try:
        enforce_rate_limit(request)
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
    return response

# Rotas
app.include_router(auth_router)
private_dependencies = [Depends(get_current_user)]
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


@app.get("/{path:path}", include_in_schema=False)
def serve_spa(path: str):
    """Serve Vite assets and let React Router handle client-side routes."""
    first_segment = path.partition("/")[0]
    if first_segment in API_ROUTE_PREFIXES:
        raise HTTPException(status_code=404, detail="Endpoint nao encontrado.")

    requested_file = (STATIC_DIR / path).resolve()
    if STATIC_DIR.resolve() in requested_file.parents and requested_file.is_file():
        return FileResponse(requested_file)
    if SPA_INDEX.is_file():
        return FileResponse(SPA_INDEX)
    raise HTTPException(status_code=404, detail="Frontend nao compilado.")
