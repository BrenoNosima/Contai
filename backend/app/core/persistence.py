from typing import TypeVar
from contextlib import contextmanager

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    PersistenceConflictError,
    PersistenceUnavailableError,
)


T = TypeVar("T")


def commit(db: Session, entity: T | None = None) -> T | None:
    """Executa commit com rollback uniforme e refresh opcional."""

    try:
        if getattr(db, "info", {}).get("defer_commit"):
            db.flush()
        else:
            db.commit()
        if entity is not None:
            db.refresh(entity)
        return entity
    except IntegrityError as error:
        db.rollback()
        raise PersistenceConflictError(
            "A operação conflita com dados já existentes."
        ) from error
    except SQLAlchemyError as error:
        db.rollback()
        raise PersistenceUnavailableError(
            "Não foi possível concluir a operação no banco de dados."
        ) from error


@contextmanager
def atomic_operation(db: Session):
    """Defer repository commits until the whole operation has succeeded."""
    if db.info.get("defer_commit"):
        raise ValueError("Operação atômica já em andamento.")
    db.info["defer_commit"] = True
    try:
        yield
        db.info.pop("defer_commit")
        commit(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.info.pop("defer_commit", None)
