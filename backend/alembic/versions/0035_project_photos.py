"""Allow private WebP galleries on whole developments without changing existing files."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0035_project_photos"
down_revision = "0034_proactive_work"
branch_labels = None
depends_on = None


def constraint(projects: bool) -> str:
    target = (
        "(property_id IS NOT NULL OR development_id IS NOT NULL)"
        if projects
        else "property_id IS NOT NULL"
    )
    return (
        "purpose IN ('attachment','photo','generated') AND "
        f"(purpose<>'photo' OR ({target} AND mime_type='image/webp')) AND "
        "(purpose<>'generated' OR (template_code IS NOT NULL AND mime_type='application/pdf' "
        "AND (enquiry_id IS NOT NULL OR deal_id IS NOT NULL))) AND "
        "(purpose='generated' OR template_code IS NULL)"
    )


def upgrade() -> None:
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint("document_purpose", "document", constraint(True))


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROJECT_PHOTO_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM document WHERE purpose='photo' "
            "AND development_id IS NOT NULL)"
        )
    ):
        raise RuntimeError("PROJECT_PHOTO_DATA_DOWNGRADE_REFUSED")
    op.drop_constraint("document_purpose", "document", type_="check")
    op.create_check_constraint("document_purpose", "document", constraint(False))
