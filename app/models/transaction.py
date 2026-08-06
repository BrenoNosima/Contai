from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
)

from app.core.database import Base


class Transaction(Base):
    """
    Representa uma movimentação financeira.

    Pode ser:
    - Receita
    - Despesa
    """

    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # income | expense
    type = Column(
        String(20),
        nullable=False,
    )

    description = Column(
        String(255),
        nullable=False,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    # essential | desirable | superfluous
    priority = Column(
        String(50),
        nullable=True,
    )

    # manual | ai | recurring
    source = Column(
        String(50),
        default="manual",
        nullable=False,
    )

    # futuro login
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
    def is_income(self):
        return self.type == "income"

    @property
    def is_expense(self):
        return self.type == "expense"

    def __repr__(self):
        return (
            f"<Transaction("
            f"id={self.id}, "
            f"type='{self.type}', "
            f"category='{self.category}', "
            f"amount={self.amount}"
            f")>"
        )