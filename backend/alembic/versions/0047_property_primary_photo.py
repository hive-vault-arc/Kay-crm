"""Persist one explicitly selected cover photo per physical property."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0047_property_primary_photo"
down_revision = "0046_inventory_received_on"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document",
        sa.Column("is_primary_photo", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_check_constraint(
        "document_primary_photo_scope",
        "document",
        "NOT is_primary_photo OR (property_id IS NOT NULL AND archived_at IS NULL "
        "AND mime_type IN ('image/jpeg','image/png','image/webp'))",
    )
    op.create_index(
        "uq_document_property_primary_photo",
        "document",
        ["property_id"],
        unique=True,
        postgresql_where=sa.text("is_primary_photo"),
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROPERTY_PRIMARY_PHOTO_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT FROM document WHERE is_primary_photo)")):
        raise RuntimeError("PROPERTY_PRIMARY_PHOTO_SELECTIONS_PRESENT")
    op.drop_index("uq_document_property_primary_photo", table_name="document")
    op.drop_constraint("document_primary_photo_scope", "document", type_="check")
    op.drop_column("document", "is_primary_photo")
