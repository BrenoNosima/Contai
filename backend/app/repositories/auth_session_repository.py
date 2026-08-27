from datetime import datetime
from sqlalchemy.orm import Session
from app.core.persistence import commit
from app.models.auth_session import AuthSession

class AuthSessionRepository:
    def create(self, db: Session, session: AuthSession) -> AuthSession:
        db.add(session)
        return commit(db, session)
    def get_by_id(self, db: Session, session_id: str) -> AuthSession | None:
        return db.query(AuthSession).filter(AuthSession.id == session_id).first()
    def get_by_refresh_hash(self, db: Session, token_hash: str) -> AuthSession | None:
        return db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()
    def save(self, db: Session, session: AuthSession) -> AuthSession:
        return commit(db, session)
