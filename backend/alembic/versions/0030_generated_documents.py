"""Keep generated lead/deal PDFs in the existing private document ledger."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0030_generated_documents"
down_revision = "0029_property_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("document", sa.Column("enquiry_id", sa.Uuid(), nullable=True))
    op.add_column("document", sa.Column("template_code", sa.String(40), nullable=True))
    op.create_foreign_key(
        "fk_document_enquiry", "document", "enquiry", ["enquiry_id"], ["id"], ondelete="RESTRICT"
    )
    op.create_index("ix_document_enquiry_id", "document", ["enquiry_id"])
    op.drop_constraint("document_one_parent", "document", type_="check")
    op.create_check_constraint(
        "document_one_parent",
        "document",
        "num_nonnulls(contact_id,development_id,property_id,deal_id,enquiry_id)=1",
    )
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint(
        "document_purpose",
        "document",
        "purpose IN ('attachment','photo','generated') AND "
        "(purpose<>'photo' OR (property_id IS NOT NULL AND mime_type='image/webp')) AND "
        "(purpose<>'generated' OR (template_code IS NOT NULL AND mime_type='application/pdf' "
        "AND (enquiry_id IS NOT NULL OR deal_id IS NOT NULL))) AND "
        "(purpose='generated' OR template_code IS NULL)",
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("GENERATED_DOCUMENT_DOWNGRADE_REFUSED")
    bind = op.get_bind()
    if bind.scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM document WHERE enquiry_id IS NOT NULL "
            "OR template_code IS NOT NULL)"
        )
    ):
        raise RuntimeError("GENERATED_DOCUMENT_DATA_DOWNGRADE_REFUSED")
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint(
        "document_purpose",
        "document",
        "purpose IN ('attachment','photo') AND "
        "(purpose<>'photo' OR (property_id IS NOT NULL AND mime_type='image/webp'))",
    )
    op.drop_constraint("document_one_parent", "document", type_="check")
    op.create_check_constraint(
        "document_one_parent",
        "document",
        "num_nonnulls(contact_id,development_id,property_id,deal_id)=1",
    )
    op.drop_index("ix_document_enquiry_id", table_name="document")
    op.drop_constraint("fk_document_enquiry", "document", type_="foreignkey")
    op.drop_column("document", "template_code")
    op.drop_column("document", "enquiry_id")
