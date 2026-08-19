from app.models.goal import Goal

from app.repositories.goal_repository import (
    GoalRepository,
)


class GoalService:

    def __init__(self):
        self.repository = GoalRepository()

    def create_goal(
        self,
        db,
        goal_data,
    ):

        goal = Goal(
            name=goal_data.name,
            description=goal_data.description,
            target_amount=goal_data.target_amount,
            current_amount=goal_data.current_amount,
            deadline=goal_data.deadline,
        )

        return self.repository.create(
            db,
            goal,
        )

    def get_goal(
        self,
        db,
        goal_id,
    ):

        return self.repository.get_by_id(
            db,
            goal_id,
        )

    def get_all_goals(
        self,
        db,
    ):

        return self.repository.get_all(
            db,
        )

    def update_goal(
        self,
        db,
        goal_id,
        update_data,
    ):

        goal = self.repository.get_by_id(
            db,
            goal_id,
        )

        if not goal:
            return None

        for field, value in update_data.model_dump(
            exclude_unset=True
        ).items():
            setattr(
                goal,
                field,
                value,
            )

        return self.repository.update(
            db,
            goal,
        )

    def delete_goal(
        self,
        db,
        goal_id,
    ):

        goal = self.repository.get_by_id(
            db,
            goal_id,
        )

        if not goal:
            return False

        self.repository.delete(
            db,
            goal,
        )

        return True

    def add_progress(
        self,
        db,
        goal_id,
        amount,
    ):

        goal = self.repository.get_by_id(
            db,
            goal_id,
        )

        if not goal:
            return None

        if amount <= 0:
            raise ValueError("O progresso deve ser maior que zero.")

        return self.repository.add_progress(
            db,
            goal,
            amount,
        )

    def calculate_monthly_saving(
        self,
        goal,
        months_remaining,
    ):

        if months_remaining <= 0:
            return 0

        remaining_amount = (
            goal.target_amount
            - goal.current_amount
        )

        return round(
            remaining_amount / months_remaining,
            2,
        )
