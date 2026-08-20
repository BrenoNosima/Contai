from app.models.fixed_expense import FixedExpense

from app.repositories.fixed_expense_repository import (
    FixedExpenseRepository,
)
from app.repositories.transaction_repository import TransactionRepository


class FixedExpenseService:

    def __init__(self):
        self.repository = FixedExpenseRepository()
        self.transaction_repository = TransactionRepository()

    def create_fixed_expense(
        self,
        db,
        expense_data,
    ):

        expense = FixedExpense(
            name=expense_data.name,
            category=expense_data.category,
            amount=expense_data.amount,
            billing_day=expense_data.billing_day,
        )

        return self.repository.create(
            db,
            expense,
        )

    def get_all_fixed_expenses(
        self,
        db,
    ):

        return self.repository.get_all(
            db,
        )

    def get_active_fixed_expenses(
        self,
        db,
    ):

        return self.repository.get_active(
            db,
        )

    def update_fixed_expense(
        self,
        db,
        expense_id,
        update_data,
    ):

        expense = self.repository.get_by_id(
            db,
            expense_id,
        )

        if not expense:
            return None

        for field, value in update_data.model_dump(
            exclude_unset=True
        ).items():
            setattr(
                expense,
                field,
                value,
            )

        updated = self.repository.update(
            db,
            expense,
        )

        if updated.active:
            self.transaction_repository.sync_pending_fixed_expense_occurrences(
                db,
                updated,
            )
        else:
            self.transaction_repository.remove_pending_fixed_expense_occurrences(
                db,
                updated.id,
            )

        return updated

    def delete_fixed_expense(
        self,
        db,
        expense_id,
    ):

        expense = self.repository.get_by_id(
            db,
            expense_id,
        )

        if not expense:
            return False

        self.transaction_repository.remove_pending_fixed_expense_occurrences(
            db,
            expense.id,
        )
        self.transaction_repository.detach_fixed_expense_history(
            db,
            expense.id,
        )

        self.repository.delete(
            db,
            expense,
        )

        return True
