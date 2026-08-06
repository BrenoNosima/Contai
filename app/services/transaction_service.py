from app.models.transaction import Transaction
from app.repositories.transaction_repository import (
    TransactionRepository,
)


class TransactionService:

    def __init__(self):
        self.repository = TransactionRepository()

    def create_transaction(
        self,
        db,
        transaction_data,
    ):

        transaction = Transaction(
            type=transaction_data.type,
            description=transaction_data.description,
            category=transaction_data.category,
            amount=transaction_data.amount,
            priority=transaction_data.priority,
            source=transaction_data.source,
        )

        return self.repository.create(
            db,
            transaction,
        )

    def get_transaction(
        self,
        db,
        transaction_id,
    ):

        return self.repository.get_by_id(
            db,
            transaction_id,
        )

    def get_all_transactions(
        self,
        db,
    ):

        return self.repository.get_all(db)

    def update_transaction(
        self,
        db,
        transaction_id,
        update_data,
    ):

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return None

        for field, value in update_data.dict(
            exclude_unset=True
        ).items():
            setattr(transaction, field, value)

        return self.repository.update(
            db,
            transaction,
        )

    def delete_transaction(
        self,
        db,
        transaction_id,
    ):

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return False

        self.repository.delete(
            db,
            transaction,
        )

        return True

    def get_balance(
        self,
        db,
    ):

        total_income = self.repository.get_total_income(
            db
        )

        total_expense = self.repository.get_total_expense(
            db
        )

        return total_income - total_expense