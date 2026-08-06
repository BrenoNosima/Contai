from sqlalchemy.orm import Session

from app.models.goal import Goal


class GoalRepository:

    def create(
        self,
        db: Session,
        goal: Goal,
    ):

        db.add(goal)
        db.commit()
        db.refresh(goal)

        return goal

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

        db.commit()
        db.refresh(goal)

        return goal

    def delete(
        self,
        db: Session,
        goal: Goal,
    ):

        db.delete(goal)
        db.commit()

    def add_progress(
        self,
        db: Session,
        goal: Goal,
        amount: float,
    ):

        goal.current_amount += amount

        db.commit()
        db.refresh(goal)

        return goal