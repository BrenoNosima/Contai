from collections import defaultdict, deque
from dataclasses import dataclass
import hashlib
import hmac
import secrets
import threading
import time

from fastapi import HTTPException, Request

from app.core.config import SETTINGS


CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def create_csrf_token() -> str:
    nonce = secrets.token_urlsafe(32)
    signature = hmac.new(
        SETTINGS.jwt_secret_key.encode("utf-8"), nonce.encode("ascii"), hashlib.sha256
    ).hexdigest()
    return f"{nonce}.{signature}"


def validate_csrf_token(token: str) -> bool:
    try:
        nonce, supplied = token.rsplit(".", 1)
        expected = hmac.new(
            SETTINGS.jwt_secret_key.encode("utf-8"), nonce.encode("ascii"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, supplied)
    except (ValueError, UnicodeEncodeError):
        return False


def validate_csrf_request(request: Request) -> None:
    if request.method not in UNSAFE_METHODS:
        return
    if request.headers.get("content-type", "").split(";", 1)[0] != "application/json":
        raise HTTPException(415, "Requisições mutáveis exigem application/json.")
    fetch_site = request.headers.get("sec-fetch-site")
    if fetch_site == "cross-site":
        raise HTTPException(403, "Origem da requisição não autorizada.")
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in SETTINGS.cors_origins:
        raise HTTPException(403, "Origem da requisição não autorizada.")
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME, "")
    header_token = request.headers.get(CSRF_HEADER_NAME, "")
    if not cookie_token or not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(403, "Token CSRF ausente ou inválido.")
    if not validate_csrf_token(cookie_token):
        raise HTTPException(403, "Token CSRF ausente ou inválido.")


@dataclass(frozen=True)
class RateRule:
    requests: int
    window_seconds: int


class InMemoryRateLimiter:
    """Limitador local. Em múltiplas instâncias, substitua o storage por Redis."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, rule: RateRule) -> None:
        now = time.monotonic()
        threshold = now - rule.window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= threshold:
                events.popleft()
            if len(events) >= rule.requests:
                retry_after = max(1, int(rule.window_seconds - (now - events[0])))
                raise HTTPException(
                    status_code=429,
                    detail="Muitas tentativas. Aguarde antes de tentar novamente.",
                    headers={"Retry-After": str(retry_after)},
                )
            events.append(now)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()


RATE_LIMITER = InMemoryRateLimiter()
RATE_RULES = {
    "/auth/login": RateRule(5, 60),
    "/auth/register": RateRule(3, 3600),
    "/auth/refresh": RateRule(20, 60),
    "/chat/": RateRule(10, 60),
}


def enforce_rate_limit(request: Request) -> None:
    rule = RATE_RULES.get(request.url.path)
    if not rule:
        return
    client_ip = request.client.host if request.client else "unknown"
    RATE_LIMITER.check(f"{request.url.path}:{client_ip}", rule)


def add_security_headers(response) -> None:
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "font-src 'self' data:; img-src 'self' data:; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    )
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-XSS-Protection"] = "0"
    if SETTINGS.cookie_secure:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
