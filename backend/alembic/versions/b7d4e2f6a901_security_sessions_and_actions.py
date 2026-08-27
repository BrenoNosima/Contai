"""security sessions and assistant actions

Revision ID: b7d4e2f6a901
Revises: f09c2a4d7e31
"""
from alembic import op
import sqlalchemy as sa

revision = "b7d4e2f6a901"
down_revision = "f09c2a4d7e31"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("auth_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("refresh_token_hash"))
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_refresh_token_hash", "auth_sessions", ["refresh_token_hash"], unique=True)
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.create_table("assistant_actions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_assistant_actions_user_id", "assistant_actions", ["user_id"])
    op.create_index("ix_assistant_actions_status", "assistant_actions", ["status"])
    op.create_index("ix_assistant_actions_expires_at", "assistant_actions", ["expires_at"])

def downgrade() -> None:
    op.drop_index("ix_assistant_actions_expires_at", table_name="assistant_actions")
    op.drop_index("ix_assistant_actions_status", table_name="assistant_actions")
    op.drop_index("ix_assistant_actions_user_id", table_name="assistant_actions")
    op.drop_table("assistant_actions")
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_refresh_token_hash", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
