from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ExportJob(Base):
    __tablename__ = "export_job"
    __table_args__ = (
        UniqueConstraint("author_user_id", "request_key", name="uq_export_request"),
        CheckConstraint("state IN ('queued','ready','failed','denied')", name="export_state"),
        CheckConstraint("kind IN ('contacts','enquiries')", name="export_kind"),
        CheckConstraint(
            "row_count>=0 AND row_count<=50000 AND size_bytes>=0 AND size_bytes<=20971520",
            name="export_bounds",
        ),
        CheckConstraint(
            "(state='ready')=(object_key IS NOT NULL AND file_hash IS NOT NULL "
            "AND completed_at IS NOT NULL)",
            name="export_ready",
        ),
        Index("ix_export_author_created", "author_user_id", "created_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    author_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    request_session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id", ondelete="RESTRICT"))
    request_key: Mapped[UUID]
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    kind: Mapped[str] = mapped_column(String(16))
    filters: Mapped[dict[str, object]] = mapped_column(JSONB)
    state: Mapped[str] = mapped_column(String(16), default="queued")
    error_code: Mapped[str | None] = mapped_column(String(40))
    row_count: Mapped[int] = mapped_column(default=0)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    object_key: Mapped[UUID | None] = mapped_column(unique=True)
    file_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    permit_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    binding_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    permit_session_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("session.id", ondelete="RESTRICT")
    )
    permit_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    permit_consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
