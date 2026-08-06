from fastapi import FastAPI

from app.core.database import Base
from app.core.database import engine

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

# Criação automática das tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Breno Finance AI",
    description="Sistema financeiro pessoal com IA",
    version="0.1.0",
)

# Rotas
app.include_router(transactions_router)
app.include_router(goals_router)
app.include_router(fixed_expenses_router)
app.include_router(dashboard_router)


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