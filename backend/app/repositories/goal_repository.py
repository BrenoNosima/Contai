from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import case, update

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

        new_amount = Goal.current_amount + Decimal(str(amount))
        db.execute(update(Goal).where(Goal.id == goal.id).values(
            current_amount=case((new_amount > Goal.target_amount, Goal.target_amount), else_=new_amount)
        ).execution_options(synchronize_session=False))
        return commit(db, goal)
