from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class WebsiteSource(Base):
    __tablename__ = "website_source"
    __table_args__ = (
        CheckConstraint(
            "source_key ~ '^[a-z0-9_-]{1,40}$' AND length(btrim(name))>0 "
            "AND octet_length(key_digest)=32",
            name="website_source_bounds",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_key: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    key_digest: Mapped[bytes] = mapped_column(LargeBinary(32))
    default_agent_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WebsiteReceipt(Base):
    __tablename__ = "website_receipt"
    __table_args__ = (
        UniqueConstraint("source_id", "submission_id", name="uq_website_submission"),
        CheckConstraint("state IN ('queued','processed','failed')", name="website_receipt_state"),
        CheckConstraint(
            "(state='processed')=(enquiry_id IS NOT NULL)", name="website_receipt_result"
        ),
        CheckConstraint(
            "submission_id ~ '^[A-Za-z0-9_-]{1,100}$' AND octet_length(request_hash)=32 "
            "AND jsonb_typeof(payload)='object'",
            name="website_receipt_bounds",
        ),
        CheckConstraint(
            "(state='processed')=(processed_at IS NOT NULL)", name="website_receipt_time"
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_id: Mapped[UUID] = mapped_column(ForeignKey("website_source.id", ondelete="RESTRICT"))
    submission_id: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    payload: Mapped[dict[str, object]] = mapped_column(JSONB)
    state: Mapped[str] = mapped_column(String(16), default="queued")
    enquiry_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("enquiry.id", ondelete="RESTRICT"), unique=True
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
