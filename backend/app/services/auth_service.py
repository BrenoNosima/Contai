from sqlalchemy import update
from sqlalchemy.orm import Session
from datetime import UTC, datetime, timedelta
import secrets
from app.core.persistence import commit
from app.core.config import SETTINGS
from app.core.security import create_refresh_token, hash_password, hash_refresh_token, verify_password
from app.core.password_policy import validate_password_strength
from app.models.auth_session import AuthSession
from app.repositories.auth_session_repository import AuthSessionRepository
from app.models.fixed_expense import FixedExpense
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.models.assistant_action import AssistantAction
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
        validate_password_strength(password)
        user = self.repository.create(db, User(name=name.strip(), email=normalized_email, password_hash=hash_password(password), must_change_password=False))
        if first_user:
            for model in (Transaction, Goal, FixedExpense):
                db.execute(update(model).where(model.user_id.is_(None)).values(user_id=user.id))
            commit(db)
        return user

    def authenticate(self, db: Session, *, email: str, password: str) -> User | None:
        user = self.repository.get_by_email(db, email.strip().lower())
        return user if user and user.is_active and verify_password(password, user.password_hash) else None

    def update_profile(self, db: Session, user: User, *, name: str, email: str, password: str) -> User:
        if not verify_password(password, user.password_hash):
            raise ValueError("Senha atual inválida.")
        normalized_email = email.strip().lower()
        existing = self.repository.get_by_email(db, normalized_email)
        if existing and existing.id != user.id:
            raise ValueError("Já existe uma conta com este e-mail.")
        user.name = name.strip()
        user.email = normalized_email
        return self.repository.save(db, user)

    def export_user_data(self, db: Session, user: User) -> dict:
        def values(items, fields):
            return [{field: getattr(item, field) for field in fields} for item in items]
        return {
            "exported_at": datetime.now(UTC),
            "user": {"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at},
            "transactions": values(db.query(Transaction).all(), (
                "id", "type", "description", "category", "amount", "priority", "source",
                "due_date", "status", "settled_at", "is_recurring", "recurrence", "created_at", "updated_at",
            )),
            "goals": values(db.query(Goal).all(), (
                "id", "name", "description", "target_amount", "current_amount", "deadline", "created_at", "updated_at",
            )),
            "fixed_expenses": values(db.query(FixedExpense).all(), (
                "id", "name", "category", "amount", "billing_day", "active", "created_at", "updated_at",
            )),
            "assistant_actions": values(db.query(AssistantAction).all(), (
                "id", "action", "payload", "status", "expires_at", "created_at",
            )),
        }

    def delete_account(self, db: Session, user: User, *, password: str) -> None:
        if not verify_password(password, user.password_hash):
            raise ValueError("Senha atual inválida.")
        for model in (AssistantAction, AuthSession, Transaction, Goal, FixedExpense):
            db.query(model).filter(model.user_id == user.id).delete(synchronize_session=False)
        db.delete(user)
        commit(db)

    def change_password(self, db: Session, user: User, *, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Senha atual inválida.")
        validate_password_strength(new_password)
        if verify_password(new_password, user.password_hash):
            raise ValueError("A nova senha deve ser diferente da senha atual.")
        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        db.query(AuthSession).filter(AuthSession.user_id == user.id).update(
            {AuthSession.revoked: True}, synchronize_session=False
        )
        commit(db, user)
