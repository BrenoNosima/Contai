from sqlalchemy.orm import Session

from app.models.transaction import Transaction

from app.repositories.transaction_repository import (
    TransactionRepository,
)

from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
)


class TransactionService:

    def __init__(self):
        self.repository = TransactionRepository()

    def create_transaction(
        self,
        db: Session,
        transaction_data: TransactionCreate,
    ) -> Transaction:

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
        db: Session,
        transaction_id: int,
    ) -> Transaction | None:

        return self.repository.get_by_id(
            db,
            transaction_id,
        )

    def get_all_transactions(
        self,
        db: Session,
    ):
        return self.repository.get_all(db)

    def update_transaction(
        self,
        db: Session,
        transaction_id: int,
        update_data: TransactionUpdate,
    ) -> Transaction | None:

        transaction = self.repository.get_by_id(
            db,
            transaction_id,
        )

        if not transaction:
            return None

        for field, value in update_data.model_dump(
            exclude_unset=True
        ).items():
            setattr(
                transaction,
                field,
                value,
            )

        return self.repository.update(
            db,
            transaction,
        )

    def delete_transaction(
        self,
        db: Session,
        transaction_id: int,
    ) -> bool:

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
        db: Session,
    ) -> float:

        total_income = self.repository.get_total_income(
            db
        )

        total_expense = self.repository.get_total_expense(
            db
        )

        return float(
            total_income - total_expense
        )