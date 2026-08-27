# app/models/goal.py

from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    DateTime,
    ForeignKey,
)

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Goal(Base):

    __tablename__ = "goals"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        String(300),
        nullable=True,
    )

    # Quanto deseja atingir
    target_amount = Column(
        Numeric(14, 2),
        nullable=False,
    )

    # Quanto já possui guardado
    current_amount = Column(
        Numeric(14, 2),
        nullable=False,
        default=0.0,
    )

    # Data limite para atingir a meta
    deadline = Column(
        DateTime,
        nullable=True,
    )

    # Futuro sistema de usuários
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime,
        default=utc_now,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    @property
    def progress_percentage(self):
        """
        Retorna o percentual concluído da meta.
        """

        if self.target_amount == 0:
            return 0

        return round(
            (self.current_amount / self.target_amount) * 100,
            2,
        )

    @property
    def remaining_amount(self):
        """
        Retorna quanto falta para concluir a meta.
        """

        return round(
            self.target_amount - self.current_amount,
            2,
        )

    @property
    def status(self):
        """
        Status calculado da meta — não precisa de coluna/migração:

        - "completed": já atingiu o valor alvo.
        - "overdue": passou do prazo sem atingir o valor alvo.
        - "active": em andamento dentro do prazo (ou sem prazo definido).
        """

        if self.current_amount >= self.target_amount:
            return "completed"

        if self.deadline and utc_now() > self.deadline:
            return "overdue"

        return "active"

    def __repr__(self):
        return (
            f"<Goal("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"target_amount={self.target_amount}, "
            f"current_amount={self.current_amount}"
            f")>"
        )
