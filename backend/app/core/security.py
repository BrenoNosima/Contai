import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from app.core.config import SETTINGS

PASSWORD_ITERATIONS = 600_000

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"

def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256": return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

def _decode_b64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

def create_access_token(user_id: int, session_id: str) -> str:
    if len(SETTINGS.jwt_secret_key) < 32 or SETTINGS.jwt_secret_key.startswith("replace-"):
        raise RuntimeError("JWT_SECRET_KEY deve ser um segredo aleatório com ao menos 32 caracteres.")
    now = int(time.time())
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    claims = {"sub": str(user_id), "sid": session_id, "iat": now, "exp": now + SETTINGS.jwt_expire_minutes * 60, "jti": secrets.token_urlsafe(16)}
    payload = _b64url(json.dumps(claims, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _b64url(hmac.new(SETTINGS.jwt_secret_key.encode(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"

def decode_access_token(token: str) -> tuple[int, str]:
    if len(SETTINGS.jwt_secret_key) < 32 or SETTINGS.jwt_secret_key.startswith("replace-"):
        raise ValueError("JWT indisponível")
    try:
        header, payload, signature = token.split(".")
        header_data = json.loads(_decode_b64url(header))
        if header_data.get("alg") != "HS256" or header_data.get("typ") != "JWT":
            raise ValueError("cabeçalho inválido")
        signing_input = f"{header}.{payload}".encode("ascii")
        supplied_signature = _decode_b64url(signature)
        signing_keys = (
            SETTINGS.jwt_secret_key,
            SETTINGS.jwt_previous_secret_key,
            SETTINGS.jwt_next_secret_key,
        )
        if not any(
            key and hmac.compare_digest(
                hmac.new(key.encode(), signing_input, hashlib.sha256).digest(),
                supplied_signature,
            )
            for key in signing_keys
        ):
            raise ValueError("assinatura inválida")
        claims = json.loads(_decode_b64url(payload))
        if claims.get("exp", 0) <= int(time.time()): raise ValueError("token expirado")
        return int(claims["sub"]), str(claims["sid"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise ValueError("Token inválido ou expirado") from error

def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)

def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
