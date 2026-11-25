"""Shared request limits and indexes for scoped finance queries."""
from alembic import op
import sqlalchemy as sa

revision = "c91f5b2d870a"
down_revision = "a4f39c8d201e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("request_limits", sa.Column("key", sa.String(64), primary_key=True),
                    sa.Column("requests", sa.Integer(), nullable=False),
                    sa.Column("expires_at", sa.DateTime(), nullable=False))
    op.create_index("ix_request_limits_expires_at", "request_limits", ["expires_at"])
    op.create_index("ix_transactions_user_status_due", "transactions", ["user_id", "status", "due_date"])
    op.create_index("ix_transactions_user_settled", "transactions", ["user_id", "settled_at"])


def downgrade():
    op.drop_index("ix_transactions_user_settled", table_name="transactions")
    op.drop_index("ix_transactions_user_status_due", table_name="transactions")
    op.drop_index("ix_request_limits_expires_at", table_name="request_limits")
    op.drop_table("request_limits")
