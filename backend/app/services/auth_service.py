from sqlalchemy import update
from sqlalchemy.orm import Session
from app.core.persistence import commit
from app.core.security import hash_password, verify_password
from app.models.fixed_expense import FixedExpense
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User
from app.repositories.user_repository import UserRepository

class AuthService:
    def __init__(self): self.repository = UserRepository()

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
