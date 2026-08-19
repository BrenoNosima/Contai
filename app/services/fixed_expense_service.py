from app.models.fixed_expense import FixedExpense

from app.repositories.fixed_expense_repository import (
    FixedExpenseRepository,
)


class FixedExpenseService:

    def __init__(self):
        self.repository = FixedExpenseRepository()

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

    def get_fixed_expense(
        self,
        db,
        expense_id,
    ):

        return self.repository.get_by_id(
            db,
            expense_id,
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

        return self.repository.update(
            db,
            expense,
        )

    def disable_fixed_expense(
        self,
        db,
        expense_id,
    ):

        expense = self.repository.get_by_id(
            db,
            expense_id,
        )

        if not expense:
            return None

        return self.repository.disable(
            db,
            expense,
        )

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

        self.repository.delete(
            db,
            expense,
        )

        return True
