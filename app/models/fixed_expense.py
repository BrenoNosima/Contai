from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
)

from app.core.database import Base


class FixedExpense(Base):

    __tablename__ = "fixed_expenses"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # Nome do gasto
    # Exemplo:
    # Internet
    # Spotify
    # Netflix
    # Faculdade
    name = Column(
        String(150),
        nullable=False,
    )

    # Categoria do gasto
    category = Column(
        String(100),
        nullable=False,
    )

    # Valor da cobrança
    amount = Column(
        Float,
        nullable=False,
    )

    # Dia do vencimento
    # Exemplo:
    # 5
    # 10
    # 20
    billing_day = Column(
        Integer,
        nullable=False,
    )

    # Controle para pausas sem deletar
    active = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Reservado para login futuro
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
    def is_active(self):
        """
        Retorna se o gasto está ativo.
        """

        return self.active

    def __repr__(self):
        return (
            f"<FixedExpense("
            f"id={self.id}, "
            f"name='{self.name}', "
            f"amount={self.amount}, "
            f"billing_day={self.billing_day}"
            f")>"
        )