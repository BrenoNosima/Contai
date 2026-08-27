from sqlalchemy import update
from sqlalchemy.orm import Session
from datetime import UTC, datetime, timedelta
import secrets
from app.core.persistence import commit
from app.core.config import SETTINGS
from app.core.security import create_refresh_token, hash_password, hash_refresh_token, verify_password
from app.models.auth_session import AuthSession
from app.repositories.auth_session_repository import AuthSessionRepository
from app.models.fixed_expense import FixedExpense
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.user_repository import UserRepository

class AuthService:
    def __init__(self):
        self.repository = UserRepository()
        self.sessions = AuthSessionRepository()

    def create_session(self, db: Session, user: User) -> tuple[AuthSession, str]:
        refresh_token = create_refresh_token()
        session = AuthSession(
            id=secrets.token_urlsafe(32), user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            expires_at=(datetime.now(UTC) + timedelta(days=SETTINGS.refresh_expire_days)).replace(tzinfo=None),
        )
        return self.sessions.create(db, session), refresh_token

    def rotate_session(self, db: Session, refresh_token: str) -> tuple[User, AuthSession, str] | None:
        session = self.sessions.get_by_refresh_hash(db, hash_refresh_token(refresh_token))
        now = datetime.now(UTC).replace(tzinfo=None)
        if not session or session.revoked or session.expires_at <= now:
            return None
        user = self.repository.get_by_id(db, session.user_id)
        if not user or not user.is_active:
            return None
        new_token = create_refresh_token()
        session.refresh_token_hash = hash_refresh_token(new_token)
        session.last_used_at = now
        self.sessions.save(db, session)
        return user, session, new_token

    def revoke_session(self, db: Session, session_id: str) -> None:
        session = self.sessions.get_by_id(db, session_id)
        if session:
            session.revoked = True
            self.sessions.save(db, session)

    def register(self, db: Session, *, name: str, email: str, password: str) -> User:
        normalized_email = email.strip().lower()
        if self.repository.get_by_email(db, normalized_email):
            raise ValueError("Já existe uma conta com este e-mail.")
        first_user = db.query(User.id).first() is None
        user = self.repository.create(db, User(name=name.strip(), email=normalized_email, password_hash=hash_password(password)))
        if first_user:
            for model in (Transaction, Goal, FixedExpense):
                db.execute(update(model).where(model.user_id.is_(None)).values(user_id=user.id))
            commit(db)
        return user

    def authenticate(self, db: Session, *, email: str, password: str) -> User | None:
        user = self.repository.get_by_email(db, email.strip().lower())
        return user if user and user.is_active and verify_password(password, user.password_hash) else None
