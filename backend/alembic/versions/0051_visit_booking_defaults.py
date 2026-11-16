"""Give planned visits compatibility defaults for retired form fields."""

from alembic import op

revision = "0051_visit_booking_defaults"
down_revision = "0050_inventory_videos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("SET LOCAL lock_timeout = '2s'")
    op.alter_column("visit", "title", server_default="Visite")
    op.alter_column("visit", "location", server_default="Non renseigné")
    op.alter_column("visit", "status", server_default="scheduled")


def downgrade() -> None:
    for column in ("title", "location", "status"):
        op.alter_column("visit", column, server_default=None)
