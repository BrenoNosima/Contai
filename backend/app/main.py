import logging

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS
from app.core.dependencies import get_current_user
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

logger = logging.getLogger(__name__)

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
    allow_headers=["Accept", "Content-Type", "X-Requested-With"],
)

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
