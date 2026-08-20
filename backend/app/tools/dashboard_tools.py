from langchain_core.tools import tool

from app.services.dashboard_service import DashboardService
from app.tools.common import tool_db


service = DashboardService()


@tool
def get_dashboard_summary() -> dict:
    """Retorna saldo, gastos fixos, metas, categorias e transações recentes."""

    with tool_db() as db:
        return service.get_dashboard_summary(db)
