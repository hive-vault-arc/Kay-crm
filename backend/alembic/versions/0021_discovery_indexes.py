"""Measured active-grant scope and stable audit pagination indexes."""

import sqlalchemy as sa

from alembic import op

revision = "0021_discovery_indexes"
down_revision = "0020_search_export_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_contact_collaborator_active_user",
        "contact_collaborator",
        ["user_id", "contact_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )
    op.create_index("ix_audit_page", "audit_event", [sa.text("created_at DESC"), "id"])


def downgrade() -> None:
    op.drop_index("ix_audit_page", table_name="audit_event")
    op.drop_index("ix_contact_collaborator_active_user", table_name="contact_collaborator")
