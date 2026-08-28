from app.repositories.transaction_repository import (
    TransactionRepository,
)

class DashboardService:

    def __init__(self):
        self.transaction_repository = (
            TransactionRepository()
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
            "recent_transactions": [
                {
                    "id": transaction.id,
                    "description": transaction.description,
                    "category": transaction.category,
                    "amount": transaction.amount,
                    "type": transaction.type,
                    "due_date": transaction.due_date,
                    "settled_at": transaction.settled_at,
                    "installment_number": transaction.installment_number,
                    "installment_count": transaction.installment_count,
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
