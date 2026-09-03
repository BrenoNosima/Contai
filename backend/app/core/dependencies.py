from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.repositories.user_repository import UserRepository
from app.repositories.auth_session_repository import AuthSessionRepository
from datetime import UTC, datetime
from app.models.user import User


def get_db():
    db = SessionLocal()

    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_current_user(access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticação necessária.")
    if not access_token: raise unauthorized
    try:
        user_id, session_id = decode_access_token(access_token)
    except ValueError as error:
        raise unauthorized from error
    auth_session = AuthSessionRepository().get_by_id(db, session_id)
    now = datetime.now(UTC).replace(tzinfo=None)
    if not auth_session or auth_session.revoked or auth_session.expires_at <= now:
        raise unauthorized
    user = UserRepository().get_by_id(db, user_id)
    if not user or not user.is_active: raise unauthorized
    db.info["user_id"] = user.id
    yield user

def get_password_compliant_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Troque sua senha antes de acessar os dados financeiros.",
        )
    return current_user
