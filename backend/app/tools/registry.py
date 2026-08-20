from app.tools.dashboard_tools import get_dashboard_summary
from app.tools.fixed_expense_tools import create_fixed_expense, list_fixed_expenses
from app.tools.goal_tools import add_goal_progress, create_goal, list_goals
from app.tools.report_tools import get_category_breakdown, get_monthly_report
from app.tools.transaction_tools import (
    create_transaction,
    generate_recurring_occurrences,
    get_balance,
    get_expenses_by_category,
    list_recent_transactions,
    mark_transaction_status,
    search_transactions,
)


FINANCE_TOOLS = [
    create_transaction,
    mark_transaction_status,
    search_transactions,
    generate_recurring_occurrences,
    get_balance,
    list_recent_transactions,
    get_expenses_by_category,
    get_monthly_report,
    get_category_breakdown,
    create_goal,
    list_goals,
    add_goal_progress,
    create_fixed_expense,
    list_fixed_expenses,
    get_dashboard_summary,
]
