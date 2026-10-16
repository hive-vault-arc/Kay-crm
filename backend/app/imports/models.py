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


class ImportBatch(Base):
    __tablename__ = "import_batch"
    __table_args__ = (
        UniqueConstraint("author_user_id", "create_key", name="uq_import_create_key"),
        CheckConstraint(
            "state IN ('awaiting_upload','uploading','uploaded','previewed',"
            "'repreview_required','committed')",
            name="import_batch_state",
        ),
        CheckConstraint(
            "size_bytes BETWEEN 1 AND 20971520 AND version>0", name="import_batch_bounds"
        ),
        Index("ix_import_batch_author_created", "author_user_id", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    author_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    create_key: Mapped[UUID]
    filename: Mapped[str] = mapped_column(String(180))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    state: Mapped[str] = mapped_column(String(24), default="awaiting_upload")
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    object_key: Mapped[UUID | None] = mapped_column(unique=True)
    file_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    permit_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    binding_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    permit_session_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("session.id", ondelete="RESTRICT")
    )
    permit_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    permit_consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fallback_agent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    preview_hash: Mapped[str | None] = mapped_column(String(64))
    counts: Mapped[dict[str, int]] = mapped_column(JSONB, default=dict)
    approval_key: Mapped[UUID | None]
    approval_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    approved_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    result: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ImportRow(Base):
    __tablename__ = "import_row"
    __table_args__ = (
        CheckConstraint("row_number BETWEEN 2 AND 50001", name="import_row_number"),
        CheckConstraint(
            "status IN ('eligible','invalid','skipped_existing','committed')",
            name="import_row_status",
        ),
    )
    batch_id: Mapped[UUID] = mapped_column(
        ForeignKey("import_batch.id", ondelete="RESTRICT"), primary_key=True
    )
    row_number: Mapped[int] = mapped_column(primary_key=True)
    values: Mapped[dict[str, str]] = mapped_column(JSONB)
    normalized: Mapped[dict[str, object] | None] = mapped_column(JSONB)
    errors: Mapped[list[str]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(24))
    agent_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    agent_name: Mapped[str | None] = mapped_column(String(160))
    override_agent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    contact_id: Mapped[UUID | None] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))


class ImportPreview(Base):
    __tablename__ = "import_preview"
    __table_args__ = (UniqueConstraint("batch_id", "version", name="uq_import_preview_version"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    batch_id: Mapped[UUID] = mapped_column(ForeignKey("import_batch.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger)
    preview_hash: Mapped[str] = mapped_column(String(64))
    counts: Mapped[dict[str, int]] = mapped_column(JSONB)
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
