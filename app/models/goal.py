# app/models/goal.py

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
)

from app.core.database import Base


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
        Float,
        nullable=False,
    )

    # Quanto já possui guardado
    current_amount = Column(
        Float,
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
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
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

    def __repr__(self):
        return (
            f"<Goal("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"target_amount={self.target_amount}, "
            f"current_amount={self.current_amount}"
            f")>"
        )