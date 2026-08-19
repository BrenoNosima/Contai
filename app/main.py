from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS

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

app = FastAPI(
    title="Breno Finance AI",
    description="Sistema financeiro pessoal com IA",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(transactions_router)
app.include_router(goals_router)
app.include_router(fixed_expenses_router)
app.include_router(dashboard_router)
app.include_router(chat_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "project": "Breno Finance AI",
        "version": "0.1.0",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }
