import argparse
from datetime import UTC, datetime, timedelta

from app.core.database import SessionLocal
from app.models.assistant_action import AssistantAction
from app.models.auth_session import AuthSession

RETENTION_DAYS = 30

def purge(*, apply: bool = False) -> dict[str, int | bool]:
    cutoff = (datetime.now(UTC) - timedelta(days=RETENTION_DAYS)).replace(tzinfo=None)
    with SessionLocal() as db:
        actions = db.query(AssistantAction).filter(AssistantAction.expires_at < cutoff).count()
        sessions = db.query(AuthSession).filter(AuthSession.expires_at < cutoff).count()
        if apply:
            db.query(AssistantAction).filter(AssistantAction.expires_at < cutoff).delete(synchronize_session=False)
            db.query(AuthSession).filter(AuthSession.expires_at < cutoff).delete(synchronize_session=False)
            db.commit()
        return {"applied": apply, "assistant_actions": actions, "auth_sessions": sessions}

def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica a retenção de sessões e ações expiradas.")
    parser.add_argument("--apply", action="store_true", help="Exclui os registros; sem a opção, apenas contabiliza.")
    args = parser.parse_args()
    print(purge(apply=args.apply))

if __name__ == "__main__":
    main()
