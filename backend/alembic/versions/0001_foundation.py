"""Establish migration history without inventing business tables or seed records."""

revision = "0001_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Alembic creates its own version table; no business DDL belongs to SP-02."""


def downgrade() -> None:
    """There is no business schema to remove at this revision."""
