"""Separate approved snapshots and revocable links; no plaintext link in PostgreSQL."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, LargeBinary
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ListingPublication(Base):
    __tablename__ = "listing_publication"
    __table_args__ = (
        CheckConstraint("num_nonnulls(property_id, development_id)=1", name="listing_one_target"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("property.id", ondelete="CASCADE"), unique=True
    )
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="CASCADE"), unique=True
    )
    approved_by: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(BigInteger)
    target_version: Mapped[int] = mapped_column(BigInteger)
    parent_version: Mapped[int | None] = mapped_column(BigInteger)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB)


class ListingLink(Base):
    __tablename__ = "listing_link"
    __table_args__ = (
        CheckConstraint("octet_length(token_hash)=32", name="listing_link_hash"),
        CheckConstraint("expires_at > created_at", name="listing_link_lifetime"),
        Index("ix_listing_link_publication_expiry", "publication_id", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    publication_id: Mapped[UUID] = mapped_column(
        ForeignKey("listing_publication.id", ondelete="CASCADE")
    )
    publication_version: Mapped[int] = mapped_column(BigInteger)
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
