from contextvars import ContextVar, Token

_current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)

def get_current_user_id() -> int | None:
    return _current_user_id.get()

def set_current_user_id(user_id: int) -> Token:
    return _current_user_id.set(user_id)

def reset_current_user_id(token: Token) -> None:
    _current_user_id.reset(token)
