"""Add a distinct WebP photo purpose to the existing private document flow."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0029_property_photos"
down_revision = "0028_commercial_properties"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document",
        sa.Column("purpose", sa.String(20), nullable=False, server_default="attachment"),
    )
    op.create_check_constraint(
        "document_purpose",
        "document",
        "purpose IN ('attachment','photo') AND "
        "(purpose<>'photo' OR (property_id IS NOT NULL AND mime_type='image/webp'))",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROPERTY_PHOTO_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT EXISTS(SELECT 1 FROM document WHERE purpose='photo')")):
        raise RuntimeError("PROPERTY_PHOTO_DATA_DOWNGRADE_REFUSED")
    op.drop_constraint("document_purpose", "document", type_="check")
    op.drop_column("document", "purpose")
