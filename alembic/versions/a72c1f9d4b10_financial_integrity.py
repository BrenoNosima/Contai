"""financial integrity

Revision ID: a72c1f9d4b10
Revises: d8514a14f133
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a72c1f9d4b10"
down_revision: Union[str, Sequence[str], None] = "d8514a14f133"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "transactions", "amount",
        existing_type=sa.Float(), type_=sa.Numeric(14, 2), existing_nullable=False,
    )
    op.alter_column(
        "goals", "target_amount",
        existing_type=sa.Float(), type_=sa.Numeric(14, 2), existing_nullable=False,
    )
    op.alter_column(
        "goals", "current_amount",
        existing_type=sa.Float(), type_=sa.Numeric(14, 2), existing_nullable=False,
    )
    op.alter_column(
        "fixed_expenses", "amount",
        existing_type=sa.Float(), type_=sa.Numeric(14, 2), existing_nullable=False,
    )
    op.drop_constraint("transactions_parent_id_fkey", "transactions", type_="foreignkey")
    op.create_foreign_key(
        "transactions_parent_id_fkey", "transactions", "transactions",
        ["parent_id"], ["id"], ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_transaction_parent_due_date", "transactions", ["parent_id", "due_date"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_transaction_parent_due_date", "transactions", type_="unique")
    op.drop_constraint("transactions_parent_id_fkey", "transactions", type_="foreignkey")
    op.create_foreign_key(
        "transactions_parent_id_fkey", "transactions", "transactions",
        ["parent_id"], ["id"],
    )
    op.alter_column(
        "fixed_expenses", "amount",
        existing_type=sa.Numeric(14, 2), type_=sa.Float(), existing_nullable=False,
    )
    op.alter_column(
        "goals", "current_amount",
        existing_type=sa.Numeric(14, 2), type_=sa.Float(), existing_nullable=False,
    )
    op.alter_column(
        "goals", "target_amount",
        existing_type=sa.Numeric(14, 2), type_=sa.Float(), existing_nullable=False,
    )
    op.alter_column(
        "transactions", "amount",
        existing_type=sa.Numeric(14, 2), type_=sa.Float(), existing_nullable=False,
    )
