from langchain_core.tools import tool

from app.services.dashboard_service import DashboardService
from app.core.ai_guardrails import redact_for_ai
from app.tools.common import tool_db


service = DashboardService()


@tool
def get_dashboard_summary() -> dict:
    """Retorna saldo, gastos fixos, metas, categorias e transações recentes."""

    with tool_db() as db:
        return redact_for_ai(service.get_dashboard_summary(db))
