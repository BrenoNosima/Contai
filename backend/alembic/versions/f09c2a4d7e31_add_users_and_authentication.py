"""add users and authentication

Revision ID: f09c2a4d7e31
Revises: c3e91b7a2f44
"""
from alembic import op
import sqlalchemy as sa

revision = "f09c2a4d7e31"
down_revision = "c3e91b7a2f44"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("email", name="uq_users_email"))
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    for table in ("transactions", "goals", "fixed_expenses"):
        op.create_foreign_key(f"{table}_user_id_fkey", table, "users", ["user_id"], ["id"], ondelete="CASCADE")
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

def downgrade() -> None:
    for table in ("fixed_expenses", "goals", "transactions"):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"{table}_user_id_fkey", table, type_="foreignkey")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
