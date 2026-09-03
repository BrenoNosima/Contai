from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.config import SETTINGS
from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token, decode_access_token
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, DeleteAccountRequest, LoginRequest, ProfileUpdateRequest, RegisterRequest, UserResponse
from app.services.auth_service import AuthService
from app.core.web_security import CSRF_COOKIE_NAME, create_csrf_token

router = APIRouter(prefix="/auth", tags=["Auth"])
service = AuthService()
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"

@router.get("/csrf")
def csrf(response: Response):
    token = create_csrf_token()
    response.set_cookie(
        CSRF_COOKIE_NAME, token, httponly=False, secure=SETTINGS.cookie_secure,
        samesite="strict", path="/",
    )
    return {"csrf_token": token}

def set_auth_cookies(response: Response, user_id: int, session_id: str, refresh_token: str) -> None:
    response.set_cookie(key=COOKIE_NAME, value=create_access_token(user_id, session_id), httponly=True,
        secure=SETTINGS.cookie_secure, samesite="lax", max_age=SETTINGS.jwt_expire_minutes * 60, path="/")
    response.set_cookie(key=REFRESH_COOKIE_NAME, value=refresh_token, httponly=True,
        secure=SETTINGS.cookie_secure, samesite="strict",
        max_age=SETTINGS.refresh_expire_days * 86400, path="/auth")

def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True,
        secure=SETTINGS.cookie_secure, samesite="lax")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/auth", httponly=True,
        secure=SETTINGS.cookie_secure, samesite="strict")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = service.register(db, name=payload.name, email=str(payload.email), password=payload.password)
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    session, refresh_token = service.create_session(db, user)
    set_auth_cookies(response, user.id, session.id, refresh_token)
    return user

@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = service.authenticate(db, email=str(payload.email), password=payload.password)
    if not user: raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    session, refresh_token = service.create_session(db, user)
    set_auth_cookies(response, user.id, session.id, refresh_token)
    return user

@router.post("/refresh", response_model=UserResponse)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    rotated = service.rotate_session(db, refresh_token or "")
    if not rotated:
        clear_auth_cookies(response)
        raise HTTPException(401, "Sessão inválida ou expirada.")
    user, session, new_refresh_token = rotated
    set_auth_cookies(response, user.id, session.id, new_refresh_token)
    return user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, access_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if access_token:
        try:
            _, session_id = decode_access_token(access_token)
            service.revoke_session(db, session_id)
        except ValueError:
            pass
    clear_auth_cookies(response)

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(payload: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return service.update_profile(db, current_user, name=payload.name, email=payload.email, password=payload.password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

@router.get("/me/export")
def export_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return service.export_user_data(db, current_user)

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(payload: DeleteAccountRequest, response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        service.delete_account(db, current_user, password=payload.password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    clear_auth_cookies(response)

@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: ChangePasswordRequest, response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        service.change_password(db, current_user, current_password=payload.current_password, new_password=payload.new_password)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    clear_auth_cookies(response)
