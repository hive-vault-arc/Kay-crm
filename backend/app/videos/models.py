"""Private inventory videos, bounded upload parts and revocable playback grants."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class InventoryVideo(Base):
    __tablename__ = "inventory_video"
    __table_args__ = (
        CheckConstraint(
            "(property_id IS NULL) <> (development_id IS NULL)", name="video_one_parent"
        ),
        CheckConstraint("input_size BETWEEN 1 AND 300000000", name="video_input_size"),
        CheckConstraint(
            "state IN ('uploading','queued','processing','ready','failed')", name="video_state"
        ),
        CheckConstraint(
            "(state='ready') = (output_size IS NOT NULL AND output_hash IS NOT NULL)",
            name="video_ready_output",
        ),
        CheckConstraint(
            "output_size IS NULL OR output_size BETWEEN 1 AND 48000000", name="video_output_size"
        ),
        Index("ix_video_property", "property_id", "archived_at"),
        Index("ix_video_development", "development_id", "archived_at"),
        Index("ix_video_claim", "state", "lease_until", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="CASCADE"))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="CASCADE")
    )
    creator_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    filename: Mapped[str] = mapped_column(String(160))
    input_size: Mapped[int] = mapped_column(BigInteger)
    source_fingerprint: Mapped[bytes] = mapped_column(LargeBinary)
    state: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    upload_session_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("session.id", ondelete="SET NULL")
    )
    upload_hash: Mapped[bytes | None] = mapped_column(LargeBinary)
    next_part: Mapped[int]
    attempts: Mapped[int]
    fence: Mapped[UUID | None]
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    output_key: Mapped[UUID | None] = mapped_column(unique=True)
    output_size: Mapped[int | None] = mapped_column(BigInteger)
    output_hash: Mapped[bytes | None] = mapped_column(LargeBinary)
    duration_seconds: Mapped[int | None]
    error_code: Mapped[str | None] = mapped_column(String(48))


class VideoPart(Base):
    __tablename__ = "inventory_video_part"
    video_id: Mapped[UUID] = mapped_column(
        ForeignKey("inventory_video.id", ondelete="CASCADE"), primary_key=True
    )
    number: Mapped[int] = mapped_column(primary_key=True)
    object_key: Mapped[UUID] = mapped_column(unique=True)
    size_bytes: Mapped[int]
    sha256: Mapped[bytes] = mapped_column(LargeBinary)


class PlaybackGrant(Base):
    __tablename__ = "inventory_video_grant"
    digest: Mapped[bytes] = mapped_column(LargeBinary, primary_key=True)
    video_id: Mapped[UUID] = mapped_column(ForeignKey("inventory_video.id", ondelete="CASCADE"))
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
