from contextlib import contextmanager
from datetime import date
from typing import Iterator

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.user_context import get_current_user_id
from app.core.ai_guardrails import redact_for_ai


@contextmanager
def tool_db() -> Iterator[Session]:
    user_id = get_current_user_id()
    if user_id is None:
        raise ValueError("Contexto autenticado obrigatório para ferramentas financeiras.")
    db = SessionLocal()
    try:
        db.info["user_id"] = user_id
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def parse_iso_date(value: str | None, field_name: str) -> date | dict | None:
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return redact_for_ai({
            "error": (
                f"Data inválida em {field_name}: {value!r}. "
                "Use o formato AAAA-MM-DD, por exemplo 2026-08-20."
            )
        })
