from datetime import date as date_type
from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


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
        Numeric(14, 2),
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

    # Data de referência do lançamento (vencimento/competência). Usada
    # pelo calendário e pelos relatórios mensais. Por padrão, a mesma
    # data de criação.
    due_date = Column(
        Date,
        nullable=False,
        default=date_type.today,
        index=True,
    )

    # pending | paid
    status = Column(
        String(20),
        nullable=False,
        default="paid",
        index=True,
    )

    # Marca um lançamento como um "modelo" recorrente (ex: assinatura
    # mensal lançada diretamente como transação, sem passar por
    # FixedExpense).
    is_recurring = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    # weekly | monthly — só é relevante quando is_recurring=True
    recurrence = Column(
        String(20),
        nullable=True,
    )

    # Quando esta transação foi gerada a partir de um modelo recorrente,
    # aponta para a transação original (is_recurring=True).
    parent_id = Column(
        Integer,
        ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Gasto fixo que originou esta cobrança mensal. Transações pagas
    # permanecem no histórico mesmo se o cadastro do gasto for removido.
    fixed_expense_id = Column(
        Integer,
        ForeignKey("fixed_expenses.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "parent_id", "due_date", name="uq_transaction_parent_due_date"
        ),
        UniqueConstraint(
            "fixed_expense_id",
            "due_date",
            name="uq_transaction_fixed_expense_due_date",
        ),
    )

    # futuro login
    user_id = Column(
        Integer,
        nullable=True,
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
    def is_income(self):
        return self.type == "income"

    @property
    def is_expense(self):
        return self.type == "expense"

    @property
    def is_paid(self):
        return self.status == "paid"

    def __repr__(self):
        return (
            f"<Transaction("
            f"id={self.id}, "
            f"type='{self.type}', "
            f"category='{self.category}', "
            f"amount={self.amount}, "
            f"status='{self.status}'"
            f")>"
        )
