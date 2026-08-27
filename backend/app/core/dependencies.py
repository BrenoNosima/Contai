from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.core.user_context import set_current_user_id
from app.repositories.user_repository import UserRepository


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
        user_id = decode_access_token(access_token)
    except ValueError as error:
        raise unauthorized from error
    user = UserRepository().get_by_id(db, user_id)
    if not user or not user.is_active: raise unauthorized
    db.info["user_id"] = user.id
    set_current_user_id(user.id)
    yield user
