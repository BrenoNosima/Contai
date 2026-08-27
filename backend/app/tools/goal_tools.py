from typing import Annotated

from langchain_core.tools import tool
from pydantic import Field

from app.tools.actions import propose
from app.services.goal_service import GoalService
from app.tools.common import parse_iso_date, tool_db


service = GoalService()


@tool
def create_goal(
    name: Annotated[str, Field(min_length=1, max_length=150)],
    target_amount: Annotated[float, Field(gt=0)],
    current_amount: Annotated[float, Field(ge=0)] = 0.0,
    description: Annotated[str | None, Field(max_length=300)] = None,
    deadline: str | None = None,
) -> dict:
    """Cria uma meta financeira; deadline opcional usa o formato AAAA-MM-DD."""

    with tool_db() as db:
        parsed_deadline = parse_iso_date(deadline, "deadline")
        if isinstance(parsed_deadline, dict):
            return parsed_deadline
    return propose("create_goal", {"name": name, "description": description,
        "target_amount": target_amount, "current_amount": current_amount,
        "deadline": str(parsed_deadline) if parsed_deadline else None})


@tool
def list_goals() -> list:
    """Lista metas financeiras com progresso, valor restante e status."""

    with tool_db() as db:
        return [
            {
                "id": goal.id,
                "name": goal.name,
                "target_amount": goal.target_amount,
                "current_amount": goal.current_amount,
                "progress_percentage": goal.progress_percentage,
                "remaining_amount": goal.remaining_amount,
                "deadline": str(goal.deadline) if goal.deadline else None,
                "status": goal.status,
            }
            for goal in service.get_all_goals(db)
        ]


@tool
def add_goal_progress(
    goal_id: Annotated[int, Field(ge=1)],
    amount: Annotated[float, Field(gt=0)],
) -> dict:
    """Adiciona um valor positivo ao progresso de uma meta existente."""

    return propose("add_goal_progress", {"goal_id": goal_id, "amount": amount})
