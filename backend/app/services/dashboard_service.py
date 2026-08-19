from app.repositories.transaction_repository import (
    TransactionRepository,
)

from app.repositories.fixed_expense_repository import (
    FixedExpenseRepository,
)

from app.repositories.goal_repository import (
    GoalRepository,
)


class DashboardService:

    def __init__(self):
        self.transaction_repository = (
            TransactionRepository()
        )

        self.fixed_expense_repository = (
            FixedExpenseRepository()
        )

        self.goal_repository = (
            GoalRepository()
        )

    def get_dashboard_summary(
        self,
        db,
    ):
        total_income = (
            self.transaction_repository
            .get_total_income(db)
        )

        total_expense = (
            self.transaction_repository
            .get_total_expense(db)
        )

        balance = (
            total_income
            - total_expense
        )

        fixed_expenses = (
            self.fixed_expense_repository
            .get_active(db)
        )

        fixed_expenses_total = sum(
            expense.amount
            for expense in fixed_expenses
        )

        goals = (
            self.goal_repository
            .get_all(db)
        )

        categories = (
            self.transaction_repository
            .get_expenses_by_category(
                db
            )
        )

        expenses_by_category = []

        for category, total in categories:

            expenses_by_category.append(
                {
                    "category": category,
                    "amount": total,
                }
            )

        recent_transactions = (
            self.transaction_repository
            .get_recent_transactions(db)
        )

        return {
            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "balance": balance,
            },
            "fixed_expenses_total": fixed_expenses_total,
            "goals_count": len(goals),
            "expenses_by_category": expenses_by_category,
            "recent_transactions": [
                {
                    "id": transaction.id,
                    "description": transaction.description,
                    "category": transaction.category,
                    "amount": transaction.amount,
                    "type": transaction.type,
                }
                for transaction in recent_transactions
            ],
        }

    def get_top_category(
        self,
        db,
    ):

        categories = (
            self.transaction_repository
            .get_expenses_by_category(db)
        )

        if not categories:
            return None

        top_category = max(
            categories,
            key=lambda item: item[1]
        )

        return {
            "category": top_category[0],
            "amount": top_category[1],
        }

    def get_insights(
        self,
        db,
    ):

        top_category = (
            self.get_top_category(db)
        )

        if not top_category:
            return {
                "message": "Nenhum dado encontrado."
            }

        return {
            "message":
            f"Sua maior categoria de gastos é "
            f"{top_category['category']} "
            f"com R$ {top_category['amount']}."
        }