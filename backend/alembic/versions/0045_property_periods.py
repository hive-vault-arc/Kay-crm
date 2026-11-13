"""Add per-property calendar periods."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ExcludeConstraint

from alembic import op
from app.settings import load_settings

revision = "0045_property_periods"
down_revision = "0044_calendar_priorities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE property_uuid_range AS RANGE (subtype = uuid)")
    op.create_table(
        "property_period",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "property_id",
            sa.Uuid(),
            sa.ForeignKey("property.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("start_on", sa.Date(), nullable=False),
        sa.Column("end_on", sa.Date(), nullable=False),
        sa.Column("note", sa.String(500), nullable=False, server_default=""),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "create_event_id",
            sa.Uuid(),
            sa.ForeignKey("inventory_event.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cancellation_reason", sa.String(500)),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column(
            "cancel_event_id", sa.Uuid(), sa.ForeignKey("inventory_event.id", ondelete="RESTRICT")
        ),
        sa.CheckConstraint(
            "start_on < end_on AND start_on >= '2000-01-01' AND end_on <= '2101-01-01'",
            name="property_period_order",
        ),
        sa.CheckConstraint("kind IN ('booking','closure')", name="property_period_kind"),
        sa.CheckConstraint(
            "(cancelled_at IS NULL AND cancel_event_id IS NULL AND cancellation_reason IS NULL) OR "
            "(cancelled_at IS NOT NULL AND cancel_event_id IS NOT NULL "
            "AND cancellation_reason IS NOT NULL)",
            name="property_period_release",
        ),
        ExcludeConstraint(
            (
                sa.func.property_uuid_range(
                    sa.literal_column("property_id"),
                    sa.literal_column("property_id"),
                    sa.literal_column("'[]'"),
                ),
                "&&",
            ),
            (sa.func.daterange(sa.literal_column("start_on"), sa.literal_column("end_on")), "&&"),
            where=sa.text("cancelled_at IS NULL"),
            name="property_period_no_overlap",
        ),
    )
    op.create_index("ix_property_period_property_id", "property_period", ["property_id"])


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("PROPERTY_PERIODS_DOWNGRADE_REFUSED")
    if op.get_bind().scalar(sa.text("SELECT EXISTS (SELECT FROM property_period)")):
        raise RuntimeError("PROPERTY_PERIODS_HISTORY_PRESENT")
    op.drop_table("property_period")
    op.execute("DROP TYPE property_uuid_range")
