import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.persistence import commit
from app.core.user_context import get_current_user_id
from app.models.assistant_action import AssistantAction
from app.schemas.fixed_expense import FixedExpenseCreate
from app.schemas.goal import GoalCreate
from app.schemas.transaction import TransactionCreate
from app.services.fixed_expense_service import FixedExpenseService
from app.services.goal_service import GoalService
from app.services.transaction_service import TransactionService


class AssistantActionService:
    allowed_actions = {
        "create_transaction", "mark_transaction_status", "generate_recurring_occurrences",
        "create_goal", "add_goal_progress", "create_fixed_expense",
    }

    def propose(self, db: Session, action: str, payload: dict) -> AssistantAction:
        user_id = db.info.get("user_id") or get_current_user_id()
        if user_id is None or action not in self.allowed_actions:
            raise ValueError("Ação do assistente inválida.")
        item = AssistantAction(
            id=secrets.token_urlsafe(24), user_id=user_id, action=action, payload=payload,
            expires_at=(datetime.now(UTC) + timedelta(minutes=10)).replace(tzinfo=None),
        )
        db.add(item)
        commit(db)
        db.refresh(item)
        return item

    def pending(self, db: Session) -> list[AssistantAction]:
        now = datetime.now(UTC).replace(tzinfo=None)
        return db.query(AssistantAction).filter(
            AssistantAction.status == "pending", AssistantAction.expires_at > now,
        ).order_by(AssistantAction.created_at).all()

    def confirm(self, db: Session, action_id: str) -> tuple[AssistantAction, object] | None:
        item = db.query(AssistantAction).filter(AssistantAction.id == action_id).first()
        now = datetime.now(UTC).replace(tzinfo=None)
        if not item or item.status != "pending" or item.expires_at <= now:
            return None
        p = item.payload
        tx, goals, fixed = TransactionService(), GoalService(), FixedExpenseService()
        if item.action == "create_transaction":
            result = tx.create_ai_transaction(db, TransactionCreate(**p))
        elif item.action == "mark_transaction_status":
            result = tx.update_status(db, p["transaction_id"], p["status"])
        elif item.action == "generate_recurring_occurrences":
            result = tx.generate_recurring_occurrences(db, p["months_ahead"])
        elif item.action == "create_goal":
            result = goals.create_goal(db, GoalCreate(**p))
        elif item.action == "add_goal_progress":
            result = goals.add_progress(db, p["goal_id"], p["amount"])
        else:
            result = fixed.create_fixed_expense(db, FixedExpenseCreate(**p))
        if result is None:
            raise ValueError("O registro solicitado não existe.")
        item.status = "confirmed"
        commit(db)
        return item, result

    def reject(self, db: Session, action_id: str) -> AssistantAction | None:
        item = db.query(AssistantAction).filter(AssistantAction.id == action_id, AssistantAction.status == "pending").first()
        if not item:
            return None
        item.status = "rejected"
        commit(db)
        return item

