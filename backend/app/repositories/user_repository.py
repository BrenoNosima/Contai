from sqlalchemy.orm import Session
from app.core.persistence import commit
from app.models.user import User

class UserRepository:
    def get_by_email(self, db: Session, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()
    def get_by_id(self, db: Session, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id).first()
    def create(self, db: Session, user: User) -> User:
        db.add(user)
        return commit(db, user)
