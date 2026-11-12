"""Add an optional birth date to private person contacts."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0038_contact_birth_date"
down_revision = "0037_development_phase"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contact", sa.Column("birth_date", sa.Date(), nullable=True))
    op.create_check_constraint(
        "contact_birth_date_person", "contact", "birth_date IS NULL OR type='person'"
    )


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("CONTACT_BIRTH_DATE_DOWNGRADE_REFUSED")
    op.drop_constraint("contact_birth_date_person", "contact", type_="check")
    op.drop_column("contact", "birth_date")
