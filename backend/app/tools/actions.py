from app.services.assistant_action_service import AssistantActionService
from app.tools.common import tool_db


def propose(action: str, payload: dict) -> dict:
    with tool_db() as db:
        item = AssistantActionService().propose(db, action, payload)
        return {"requires_confirmation": True, "confirmation_id": item.id,
                "action": action, "payload": payload, "expires_at": item.expires_at.isoformat()}
