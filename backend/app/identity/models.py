"""Identity persistence only; no default account or plaintext credential."""

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
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

AGENCY_ID = UUID("00000000-0000-0000-0000-000000000001")


class Agency(Base):
    __tablename__ = "agency"
    __table_args__ = (CheckConstraint(f"id = '{AGENCY_ID}'", name="agency_singleton"),)
    id: Mapped[UUID] = mapped_column(primary_key=True)
    bootstrap_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class User(Base):
    __tablename__ = "user"
    __table_args__ = (
        CheckConstraint("role IN ('administrator', 'manager', 'agent')", name="user_role"),
        CheckConstraint("state IN ('active', 'disabled', 'pending_handoff')", name="user_state"),
        CheckConstraint("email = lower(btrim(email))", name="user_normalized_email"),
        Index("ix_user_role_state", "role", "state"),
        Index("ix_user_updated_id", "updated_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    agency_id: Mapped[UUID] = mapped_column(ForeignKey("agency.id", ondelete="RESTRICT"))
    display_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    role: Mapped[str] = mapped_column(String(24))
    state: Mapped[str] = mapped_column(String(24))
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Credential(Base):
    __tablename__ = "credential"
    __table_args__ = (
        CheckConstraint(
            "must_change_password = (temporary_expires_at IS NOT NULL)",
            name="credential_temporary_state",
        ),
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    password_hash: Mapped[str] = mapped_column(String(512))
    must_change_password: Mapped[bool]
    temporary_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    handoff_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(BigInteger, default=1)


class StaffSession(Base):
    __tablename__ = "session"
    __table_args__ = (
        CheckConstraint(
            "expires_at > created_at AND expires_at <= created_at + interval '7 days'",
            name="session_max_seven_days",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"), index=True)
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_version: Mapped[int] = mapped_column(BigInteger)
    credential_version: Mapped[int] = mapped_column(BigInteger)
    role_at_login: Mapped[str] = mapped_column(String(24))


class AuditEvent(Base):
    __tablename__ = "audit_event"
    __table_args__ = (
        CheckConstraint(
            "action LIKE 'identity.%' OR action LIKE 'users.%' OR action LIKE 'contacts.%' "
            "OR action LIKE 'enquiries.%' OR action LIKE 'properties.%' "
            "OR action LIKE 'offerings.%' OR action LIKE 'developments.%' "
            "OR action LIKE 'documents.%' OR action LIKE 'requirements.%' OR action LIKE 'deals.%' "
            "OR action LIKE 'visits.%' OR action LIKE 'tasks.%' OR action LIKE 'imports.%' "
            "OR action LIKE 'exports.%'",
            name="audit_identity_action",
        ),
        Index("ix_audit_target_created", "target_user_id", "created_at"),
        Index("ix_audit_page", text("created_at DESC"), "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    website_source_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_source.id", ondelete="RESTRICT")
    )
    target_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    contact_id: Mapped[UUID | None] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    enquiry_id: Mapped[UUID | None] = mapped_column(ForeignKey("enquiry.id", ondelete="RESTRICT"))
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT")
    )
    offering_id: Mapped[UUID | None] = mapped_column(ForeignKey("offering.id", ondelete="RESTRICT"))
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    action: Mapped[str] = mapped_column(String(80))
    deployment_version: Mapped[str] = mapped_column(String(40), default="0.1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LoginRateBucket(Base):
    __tablename__ = "login_rate_bucket"
    key: Mapped[bytes] = mapped_column(LargeBinary(32), primary_key=True)
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int]


class UserCommandReceipt(Base):
    __tablename__ = "user_command_receipt"
    actor_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    key: Mapped[UUID] = mapped_column(primary_key=True)
    operation: Mapped[str] = mapped_column(String(100))
    request_digest: Mapped[bytes] = mapped_column(LargeBinary(32))
    result: Mapped[dict[str, object]] = mapped_column(JSONB)
    secret_issued: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
