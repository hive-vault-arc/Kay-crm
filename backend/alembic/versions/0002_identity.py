"""Identity bootstrap, credentials, revocable sessions and safe audit.

Revision ID: 0002_identity
Revises: 0001_foundation
"""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0002_identity"
down_revision = "0001_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agency",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("bootstrap_completed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("id = '00000000-0000-0000-0000-000000000001'", name="agency_singleton"),
    )
    op.execute("INSERT INTO agency(id) VALUES ('00000000-0000-0000-0000-000000000001')")
    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "agency_id", sa.Uuid(), sa.ForeignKey("agency.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("role", sa.String(24), nullable=False),
        sa.Column("state", sa.String(24), nullable=False),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("role IN ('administrator', 'manager', 'agent')", name="user_role"),
        sa.CheckConstraint("state IN ('active', 'disabled', 'pending_handoff')", name="user_state"),
        sa.CheckConstraint("email = lower(btrim(email))", name="user_normalized_email"),
    )
    op.create_table(
        "credential",
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
        ),
        sa.Column("password_hash", sa.String(512), nullable=False),
        sa.Column("must_change_password", sa.Boolean(), nullable=False),
        sa.Column("temporary_expires_at", sa.DateTime(timezone=True)),
        sa.Column("handoff_confirmed_at", sa.DateTime(timezone=True)),
        sa.Column("version", sa.BigInteger(), nullable=False),
    )
    op.create_table(
        "session",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("token_hash", sa.LargeBinary(32), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("user_version", sa.BigInteger(), nullable=False),
        sa.Column("credential_version", sa.BigInteger(), nullable=False),
        sa.Column("role_at_login", sa.String(24), nullable=False),
        sa.CheckConstraint(
            "expires_at > created_at AND expires_at <= created_at + interval '7 days'",
            name="session_max_seven_days",
        ),
    )
    op.create_index("ix_session_user_id", "session", ["user_id"])
    op.create_table(
        "audit_event",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "actor_user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "target_user_id",
            sa.Uuid(),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("deployment_version", sa.String(40), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "login_rate_bucket",
        sa.Column("key", sa.LargeBinary(32), primary_key=True),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    if load_settings().app_environment == "development":
        raise RuntimeError("DEVELOPMENT_IDENTITY_DOWNGRADE_REFUSED")
    # Only an explicitly selected isolated migration test downgrades this revision.
    for name in ("login_rate_bucket", "audit_event", "session", "credential", "user", "agency"):
        op.drop_table(name)
