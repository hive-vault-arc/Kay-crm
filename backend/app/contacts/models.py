"""Migration-owned private contact identities; enquiries are not duplicate contacts."""

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
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Contact(Base):
    __tablename__ = "contact"
    __table_args__ = (
        CheckConstraint("length(btrim(name)) > 0", name="contact_name_required"),
        CheckConstraint("type IN ('person','organization')", name="contact_type"),
        CheckConstraint(
            "merged_into_contact_id IS NULL OR "
            "(merged_into_contact_id <> id AND archived_at IS NOT NULL)",
            name="contact_merge_alias",
        ),
        Index("ix_contact_scope", "primary_agent_id", "archived_at"),
        Index("ix_contact_updated_id", "updated_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(24))
    primary_agent_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    source: Mapped[str] = mapped_column(String(40))
    source_submission_id: Mapped[UUID | None]
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    merged_into_contact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactPhone(Base):
    __tablename__ = "contact_phone"
    __table_args__ = (
        CheckConstraint("normalized ~ '^\\+[1-9][0-9]{6,14}$'", name="contact_phone_e164"),
        Index(
            "uq_active_phone",
            "normalized",
            unique=True,
            postgresql_where=text("archived_at IS NULL"),
        ),
        Index(
            "uq_primary_phone",
            "contact_id",
            unique=True,
            postgresql_where=text("is_primary AND archived_at IS NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    origin_contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    normalized: Mapped[str] = mapped_column(String(16))
    label: Mapped[str] = mapped_column(String(40))
    is_primary: Mapped[bool]
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactEmail(Base):
    __tablename__ = "contact_email"
    __table_args__ = (
        CheckConstraint("normalized = lower(btrim(normalized))", name="contact_email_normalized"),
        Index(
            "uq_primary_email",
            "contact_id",
            unique=True,
            postgresql_where=text("is_primary AND archived_at IS NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    origin_contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    normalized: Mapped[str] = mapped_column(String(254))
    label: Mapped[str] = mapped_column(String(40))
    is_primary: Mapped[bool]
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactRole(Base):
    __tablename__ = "contact_role"
    __table_args__ = (
        CheckConstraint(
            "role IN ('buyer','seller','owner','tenant','developer')", name="contact_role_value"
        ),
    )
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(24), primary_key=True)


class ContactCollaborator(Base):
    """One current grant per contact/user; changes have append-only history."""

    __tablename__ = "contact_collaborator"
    __table_args__ = (
        Index(
            "ix_contact_collaborator_active_user",
            "user_id",
            "contact_id",
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )
    contact_id: Mapped[UUID] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Enquiry(Base):
    __tablename__ = "enquiry"
    __table_args__ = (
        CheckConstraint("status IN ('new','in_progress','closed')", name="enquiry_status"),
        UniqueConstraint("source", "source_submission_id", name="uq_enquiry_source_submission"),
        Index("ix_enquiry_contact", "contact_id", "updated_at", "id"),
        Index("ix_enquiry_received", "source", "received_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    origin_contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    message: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(40))
    source_submission_id: Mapped[UUID | None]
    assigned_agent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    status: Mapped[str] = mapped_column(String(24), default="new")
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IdempotencyRecord(Base):
    __tablename__ = "idempotency_record"
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(100), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    response: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
