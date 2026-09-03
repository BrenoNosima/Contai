"""require strong passwords for existing users

Revision ID: a4f39c8d201e
Revises: f8a3d1c4e672
"""
from alembic import op
import sqlalchemy as sa

revision = "a4f39c8d201e"
down_revision = "f8a3d1c4e672"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("must_change_password", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.alter_column("users", "must_change_password", server_default=sa.false())

def downgrade() -> None:
    op.drop_column("users", "must_change_password")
