from app.tools.delegation_tools import analyze_finances
from app.tools.fixed_expense_tools import create_fixed_expense, list_fixed_expenses
from app.tools.goal_tools import add_goal_progress, create_goal, list_goals
from app.tools.transaction_tools import (
    create_transaction,
    generate_recurring_occurrences,
    list_recent_transactions,
    mark_transaction_status,
    search_transactions,
)


FINANCE_TOOLS = [
    create_transaction,
    mark_transaction_status,
    search_transactions,
    generate_recurring_occurrences,
    list_recent_transactions,
    create_goal,
    list_goals,
    add_goal_progress,
    create_fixed_expense,
    list_fixed_expenses,
    analyze_finances,
]
