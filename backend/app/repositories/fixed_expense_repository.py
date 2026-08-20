from sqlalchemy.orm import Session

from app.models.fixed_expense import FixedExpense
from app.core.persistence import commit


class FixedExpenseRepository:

    def create(
        self,
        db: Session,
        fixed_expense: FixedExpense,
    ):

        db.add(fixed_expense)
        return commit(db, fixed_expense)

    def get_by_id(
        self,
        db: Session,
        expense_id: int,
    ):

        return (
            db.query(FixedExpense)
            .filter(FixedExpense.id == expense_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
    ):

        return (
            db.query(FixedExpense)
            .order_by(FixedExpense.name.asc())
            .all()
        )

    def get_active(
        self,
        db: Session,
    ):

        return (
            db.query(FixedExpense)
            .filter(FixedExpense.active == True)
            .all()
        )

    def update(
        self,
        db: Session,
        fixed_expense: FixedExpense,
    ):

        return commit(db, fixed_expense)

    def delete(
        self,
        db: Session,
        fixed_expense: FixedExpense,
    ):

        db.delete(fixed_expense)
        commit(db)

    def disable(
        self,
        db: Session,
        fixed_expense: FixedExpense,
    ):

        fixed_expense.active = False

        return commit(db, fixed_expense)
