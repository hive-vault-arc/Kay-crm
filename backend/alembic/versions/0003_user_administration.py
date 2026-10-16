"""Temporary-state integrity, administrative indexes and non-secret retry receipts."""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.settings import load_settings

revision = "0003_user_administration"
down_revision = "0002_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "credential_temporary_state",
        "credential",
        "must_change_password = (temporary_expires_at IS NOT NULL)",
    )
    op.create_check_constraint(
        "audit_identity_action", "audit_event", "action LIKE 'identity.%' OR action LIKE 'users.%'"
    )
    op.create_index("ix_user_role_state", "user", ["role", "state"])
    op.create_index("ix_user_updated_id", "user", ["updated_at", "id"])
    op.create_index("ix_audit_target_created", "audit_event", ["target_user_id", "created_at"])
    op.create_table(
        "user_command_receipt",
        sa.Column(
            "actor_user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("key", sa.Uuid(), primary_key=True),
        sa.Column("operation", sa.String(100), nullable=False),
        sa.Column("request_digest", sa.LargeBinary(32), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=False),
        sa.Column("secret_issued", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_user_command_receipt_created_at", "user_command_receipt", ["created_at"])


def downgrade() -> None:
    if load_settings().app_environment == "development":
        raise RuntimeError("DEVELOPMENT_IDENTITY_DOWNGRADE_REFUSED")
    op.drop_table("user_command_receipt")
    for name, table in (
        ("ix_user_role_state", "user"),
        ("ix_user_updated_id", "user"),
        ("ix_audit_target_created", "audit_event"),
    ):
        op.drop_index(name, table_name=table)
    op.drop_constraint("audit_identity_action", "audit_event")
    op.drop_constraint("credential_temporary_state", "credential")
