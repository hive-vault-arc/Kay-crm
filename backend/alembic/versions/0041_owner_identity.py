"""Add private CIN numbers and a dedicated purpose for owner identity cards."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0041_owner_identity"
down_revision = "0040_inventory_shares"
branch_labels = None
depends_on = None

_DOCUMENT_RULES = (
    "(purpose<>'photo' OR ((property_id IS NOT NULL OR development_id IS NOT NULL) "
    "AND mime_type='image/webp')) AND "
    "(purpose<>'generated' OR (template_code IS NOT NULL AND mime_type='application/pdf' "
    "AND (enquiry_id IS NOT NULL OR deal_id IS NOT NULL))) AND "
    "(purpose='generated' OR template_code IS NULL)"
)
_CARD_RULE = (
    "(purpose<>'identity_card' OR (contact_id IS NOT NULL AND "
    "mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')))"
)


def upgrade() -> None:
    op.add_column("contact", sa.Column("national_id_number", sa.String(32), nullable=True))
    op.create_check_constraint(
        "contact_national_id_person",
        "contact",
        "national_id_number IS NULL OR (type='person' AND "
        "national_id_number ~ '^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$')",
    )
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint(
        "document_purpose",
        "document",
        f"purpose IN ('attachment','photo','generated','identity_card') AND "
        f"{_CARD_RULE} AND {_DOCUMENT_RULES}",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("OWNER_IDENTITY_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS (SELECT FROM document WHERE purpose='identity_card') OR "
            "EXISTS (SELECT FROM contact WHERE national_id_number IS NOT NULL)"
        )
    ):
        raise RuntimeError("OWNER_IDENTITY_DATA_PRESENT")
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint(
        "document_purpose",
        "document",
        f"purpose IN ('attachment','photo','generated') AND {_DOCUMENT_RULES}",
    )
    op.drop_constraint("contact_national_id_person", "contact", type_="check")
    op.drop_column("contact", "national_id_number")
