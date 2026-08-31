from app.services.assistant_action_service import AssistantActionService
from app.core.ai_guardrails import redact_for_ai, restore_sensitive_data
from app.tools.common import tool_db


def propose(action: str, payload: dict) -> dict:
    original_payload = restore_sensitive_data(payload)
    with tool_db() as db:
        item = AssistantActionService().propose(db, action, original_payload)
        return redact_for_ai({"requires_confirmation": True, "confirmation_id": item.id,
                "action": action, "payload": original_payload, "expires_at": item.expires_at.isoformat()})
