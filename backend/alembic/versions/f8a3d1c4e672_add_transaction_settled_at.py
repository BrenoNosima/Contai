"""add transaction settled timestamp

Revision ID: f8a3d1c4e672
Revises: e4b8c92d01f7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8a3d1c4e672"
down_revision: Union[str, Sequence[str], None] = "e4b8c92d01f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("settled_at", sa.DateTime(), nullable=True))
    op.execute(
        "UPDATE transactions SET settled_at = CAST(due_date AS TIMESTAMP) "
        "WHERE status = 'paid'"
    )
    op.create_index("ix_transactions_settled_at", "transactions", ["settled_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_transactions_settled_at", table_name="transactions")
    op.drop_column("transactions", "settled_at")
