"""Add session-bound realtime tickets, presence and private push delivery."""

import sqlalchemy as sa

from alembic import op

revision = "0031_realtime"
down_revision = "0030_generated_documents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "realtime_ticket",
        sa.Column("digest", sa.LargeBinary(32), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("session.id"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_realtime_ticket_session_id", "realtime_ticket", ["session_id"])
    op.create_index("ix_realtime_ticket_expires_at", "realtime_ticket", ["expires_at"])
    op.create_table(
        "push_subscription",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("session.id"), nullable=False),
        sa.Column("endpoint", sa.String(2048), nullable=False, unique=True),
        sa.Column("p256dh", sa.String(128), nullable=False),
        sa.Column("auth", sa.String(64), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_push_subscription_session_id", "push_subscription", ["session_id"])
    op.create_table(
        "realtime_presence",
        sa.Column("connection_id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("session.id"), nullable=False),
        sa.Column("seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("visible", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_realtime_presence_session_id", "realtime_presence", ["session_id"])
    op.create_index("ix_realtime_presence_seen_at", "realtime_presence", ["seen_at"])
    op.create_table(
        "push_delivery",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("notification_id", sa.Uuid(), sa.ForeignKey("notification.id"), nullable=False),
        sa.Column(
            "subscription_id", sa.Uuid(), sa.ForeignKey("push_subscription.id"), nullable=False
        ),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("session.id"), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("notification_id", "subscription_id"),
    )
    op.create_index("ix_push_delivery_available_at", "push_delivery", ["available_at"])


def downgrade() -> None:
    tables = ("push_delivery", "realtime_presence", "realtime_ticket", "push_subscription")
    bind = op.get_bind()
    for table in tables:
        if bind.scalar(sa.select(sa.exists().select_from(sa.table(table)))):
            raise RuntimeError("REALTIME_DATA_DOWNGRADE_REFUSED")
    for table in tables:
        op.drop_table(table)
