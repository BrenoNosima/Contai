"""add transaction installments

Revision ID: e4b8c92d01f7
Revises: b7d4e2f6a901
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e4b8c92d01f7"
down_revision: Union[str, Sequence[str], None] = "b7d4e2f6a901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("installment_group_id", sa.String(length=36), nullable=True))
    op.add_column("transactions", sa.Column("installment_number", sa.Integer(), nullable=True))
    op.add_column("transactions", sa.Column("installment_count", sa.Integer(), nullable=True))
    op.create_index("ix_transactions_installment_group_id", "transactions", ["installment_group_id"], unique=False)
    op.create_unique_constraint("uq_transaction_installment_number", "transactions", ["installment_group_id", "installment_number"])


def downgrade() -> None:
    op.drop_constraint("uq_transaction_installment_number", "transactions", type_="unique")
    op.drop_index("ix_transactions_installment_group_id", table_name="transactions")
    op.drop_column("transactions", "installment_count")
    op.drop_column("transactions", "installment_number")
    op.drop_column("transactions", "installment_group_id")
