"""Attributable handoff notes remain attached to their original dossier."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class CoverageNote(Base):
    __tablename__ = "coverage_note"
    __table_args__ = (
        CheckConstraint("num_nonnulls(enquiry_id, deal_id) = 1", name="coverage_note_parent"),
        CheckConstraint("length(btrim(body)) BETWEEN 1 AND 4000", name="coverage_note_body"),
        CheckConstraint("(seen_at IS NULL) = (seen_by_user_id IS NULL)", name="coverage_note_seen"),
        UniqueConstraint("author_user_id", "request_key", name="uq_coverage_note_request"),
        Index("ix_coverage_note_enquiry", "enquiry_id", "created_at", "id"),
        Index("ix_coverage_note_deal", "deal_id", "created_at", "id"),
        Index(
            "ix_coverage_note_unseen", "created_at", "id", postgresql_where=text("seen_at IS NULL")
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enquiry_id: Mapped[UUID | None] = mapped_column(ForeignKey("enquiry.id", ondelete="RESTRICT"))
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    author_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    author_name: Mapped[str] = mapped_column(String(160))
    request_key: Mapped[UUID]
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    seen_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
