from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.config import SETTINGS
from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])
service = AuthService()
COOKIE_NAME = "access_token"

def set_auth_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(key=COOKIE_NAME, value=create_access_token(user_id), httponly=True,
        secure=SETTINGS.cookie_secure, samesite="lax", max_age=SETTINGS.jwt_expire_minutes * 60, path="/")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = service.register(db, name=payload.name, email=str(payload.email), password=payload.password)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    set_auth_cookie(response, user.id)
    return user

@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = service.authenticate(db, email=str(payload.email), password=payload.password)
    if not user: raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    set_auth_cookie(response, user.id)
    return user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True,
        secure=SETTINGS.cookie_secure, samesite="lax")

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
