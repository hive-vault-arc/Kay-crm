"""Create empty tables for approved client listings and expiring links."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op
from app.settings import load_settings

revision = "0040_inventory_shares"
down_revision = "0038_contact_birth_date"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "listing_publication",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "property_id", sa.Uuid(), sa.ForeignKey("property.id", ondelete="CASCADE"), unique=True
        ),
        sa.Column(
            "development_id",
            sa.Uuid(),
            sa.ForeignKey("development.id", ondelete="CASCADE"),
            unique=True,
        ),
        sa.Column(
            "approved_by", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column("target_version", sa.BigInteger(), nullable=False),
        sa.Column("parent_version", sa.BigInteger()),
        sa.Column("snapshot", JSONB(), nullable=False),
        sa.CheckConstraint(
            "num_nonnulls(property_id, development_id)=1", name="listing_one_target"
        ),
    )
    op.create_table(
        "listing_link",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "publication_id",
            sa.Uuid(),
            sa.ForeignKey("listing_publication.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("publication_version", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(32), unique=True, nullable=False),
        sa.Column(
            "created_by", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("octet_length(token_hash)=32", name="listing_link_hash"),
        sa.CheckConstraint("expires_at > created_at", name="listing_link_lifetime"),
    )
    op.create_index(
        "ix_listing_link_publication_expiry", "listing_link", ["publication_id", "expires_at"]
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("INVENTORY_SHARES_DOWNGRADE_REFUSED")
    op.drop_table("listing_link")
    op.drop_table("listing_publication")
