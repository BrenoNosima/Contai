from typing import TypeVar

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
