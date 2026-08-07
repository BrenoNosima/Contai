from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


class TransactionRepository:

    def create(
        self,
        db: Session,
        transaction: Transaction,
    ) -> Transaction:

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return transaction

    def get_by_id(
        self,
        db: Session,
        transaction_id: int,
    ) -> Transaction | None:

        return (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
    ):

        return (
            db.query(Transaction)
            .order_by(Transaction.created_at.desc())
            .all()
        )

    def update(
        self,
        db: Session,
        transaction: Transaction,
    ) -> Transaction:

        db.commit()
        db.refresh(transaction)

        return transaction

    def delete(
        self,
        db: Session,
        transaction: Transaction,
    ) -> None:

        db.delete(transaction)
        db.commit()

    def get_total_income(
        self,
        db: Session,
    ) -> float:

        transactions = (
            db.query(Transaction)
            .filter(Transaction.type == "income")
            .all()
        )

        return sum(
            transaction.amount
            for transaction in transactions
        )

    def get_total_expense(
        self,
        db: Session,
    ) -> float:

        transactions = (
            db.query(Transaction)
            .filter(Transaction.type == "expense")
            .all()
        )

        return sum(
            transaction.amount
            for transaction in transactions
        )

    def get_expenses_by_category(
        self,
        db: Session,
    ):

        return (
            db.query(
                Transaction.category,
                func.sum(
                    Transaction.amount
                ).label("total")
            )
            .filter(
                Transaction.type == "expense"
            )
            .group_by(
                Transaction.category
            )
            .all()
        )

    def get_recent_transactions(
        self,
        db: Session,
        limit: int = 5,
    ):

        return (
            db.query(Transaction)
            .order_by(
                Transaction.created_at.desc()
            )
            .limit(limit)
            .all()
        )