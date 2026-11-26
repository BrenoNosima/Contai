"""Store the selected profile avatar, including a default for existing users."""
from alembic import op
import sqlalchemy as sa

revision = "d02b6e4f913a"
down_revision = "c91f5b2d870a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar_id", sa.String(24), nullable=False, server_default="person"))


def downgrade():
    op.drop_column("users", "avatar_id")
