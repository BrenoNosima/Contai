from contextlib import contextmanager
from datetime import date
from typing import Iterator

from sqlalchemy.orm import Session

from app.core.database import SessionLocal


@contextmanager
def tool_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def parse_iso_date(value: str | None, field_name: str) -> date | dict | None:
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        return {
            "error": (
                f"Data inválida em {field_name}: {value!r}. "
                "Use o formato AAAA-MM-DD, por exemplo 2026-08-20."
            )
        }
