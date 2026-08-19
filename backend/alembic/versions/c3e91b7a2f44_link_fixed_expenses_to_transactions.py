"""link fixed expenses to generated transactions

Revision ID: c3e91b7a2f44
Revises: a72c1f9d4b10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3e91b7a2f44"
down_revision: Union[str, Sequence[str], None] = "a72c1f9d4b10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("fixed_expense_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "transactions_fixed_expense_id_fkey",
        "transactions",
        "fixed_expenses",
        ["fixed_expense_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint(
        "uq_transaction_fixed_expense_due_date",
        "transactions",
        ["fixed_expense_id", "due_date"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_transaction_fixed_expense_due_date",
        "transactions",
        type_="unique",
    )
    op.drop_constraint(
        "transactions_fixed_expense_id_fkey",
        "transactions",
        type_="foreignkey",
    )
    op.drop_column("transactions", "fixed_expense_id")
