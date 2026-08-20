from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.goal import Goal
from app.core.persistence import commit


class GoalRepository:

    def create(
        self,
        db: Session,
        goal: Goal,
    ):

        db.add(goal)
        return commit(db, goal)

    def get_by_id(
        self,
        db: Session,
        goal_id: int,
    ):

        return (
            db.query(Goal)
            .filter(Goal.id == goal_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
    ):

        return (
            db.query(Goal)
            .order_by(Goal.created_at.desc())
            .all()
        )

    def update(
        self,
        db: Session,
        goal: Goal,
    ):

        return commit(db, goal)

    def delete(
        self,
        db: Session,
        goal: Goal,
    ):

        db.delete(goal)
        commit(db)

    def add_progress(
        self,
        db: Session,
        goal: Goal,
        amount: float,
    ):

        goal.current_amount = min(
            goal.target_amount,
            goal.current_amount + Decimal(str(amount)),
        )

        return commit(db, goal)
