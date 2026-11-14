"""Add private inventory videos and their temporary upload and playback state."""

import sqlalchemy as sa

from alembic import op
from app.settings import load_settings

revision = "0050_inventory_videos"
down_revision = "0049_moroccan_holiday_reminders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inventory_video",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("property_id", sa.Uuid(), sa.ForeignKey("property.id", ondelete="CASCADE")),
        sa.Column("development_id", sa.Uuid(), sa.ForeignKey("development.id", ondelete="CASCADE")),
        sa.Column(
            "creator_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("filename", sa.String(160), nullable=False),
        sa.Column("input_size", sa.BigInteger(), nullable=False),
        sa.Column("source_fingerprint", sa.LargeBinary(), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("upload_session_id", sa.Uuid(), sa.ForeignKey("session.id", ondelete="SET NULL")),
        sa.Column("upload_hash", sa.LargeBinary()),
        sa.Column("next_part", sa.Integer(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("fence", sa.Uuid()),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("output_key", sa.Uuid(), unique=True),
        sa.Column("output_size", sa.BigInteger()),
        sa.Column("output_hash", sa.LargeBinary()),
        sa.Column("duration_seconds", sa.Integer()),
        sa.Column("error_code", sa.String(48)),
        sa.CheckConstraint(
            "(property_id IS NULL) <> (development_id IS NULL)", name="video_one_parent"
        ),
        sa.CheckConstraint("input_size BETWEEN 1 AND 300000000", name="video_input_size"),
        sa.CheckConstraint(
            "state IN ('uploading','queued','processing','ready','failed')", name="video_state"
        ),
        sa.CheckConstraint(
            "(state='ready') = (output_size IS NOT NULL AND output_hash IS NOT NULL)",
            name="video_ready_output",
        ),
        sa.CheckConstraint(
            "output_size IS NULL OR output_size BETWEEN 1 AND 48000000", name="video_output_size"
        ),
    )
    op.create_index("ix_video_property", "inventory_video", ["property_id", "archived_at"])
    op.create_index("ix_video_development", "inventory_video", ["development_id", "archived_at"])
    op.create_index("ix_video_claim", "inventory_video", ["state", "lease_until", "created_at"])
    op.create_table(
        "inventory_video_part",
        sa.Column(
            "video_id",
            sa.Uuid(),
            sa.ForeignKey("inventory_video.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("number", sa.Integer(), primary_key=True),
        sa.Column("object_key", sa.Uuid(), nullable=False, unique=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.LargeBinary(), nullable=False),
    )
    op.create_table(
        "inventory_video_grant",
        sa.Column("digest", sa.LargeBinary(), primary_key=True),
        sa.Column(
            "video_id",
            sa.Uuid(),
            sa.ForeignKey("inventory_video.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "session_id", sa.Uuid(), sa.ForeignKey("session.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_inventory_video_grant_expires_at", "inventory_video_grant", ["expires_at"])


def downgrade() -> None:
    if load_settings().app_environment not in {"test", "benchmark", "recovery"}:
        raise RuntimeError("INVENTORY_VIDEO_DOWNGRADE_REFUSED")
    op.drop_table("inventory_video_grant")
    op.drop_table("inventory_video_part")
    op.drop_table("inventory_video")
