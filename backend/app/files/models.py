"""Migration-owned file metadata; neither plaintext permits nor file bytes enter SQL."""

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
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Document(Base):
    __tablename__ = "document"
    __table_args__ = (
        CheckConstraint(
            "num_nonnulls(contact_id,development_id,property_id,deal_id,enquiry_id)=1",
            name="document_one_parent",
        ),
        CheckConstraint(
            "(contact_id IS NULL)=(origin_contact_id IS NULL)", name="document_contact_origin"
        ),
        CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="document_size"),
        CheckConstraint("version>0", name="document_version_positive"),
        CheckConstraint(
            "purpose IN ('attachment','photo','generated') AND "
            "(purpose<>'photo' OR (property_id IS NOT NULL AND mime_type='image/webp')) AND "
            "(purpose<>'generated' OR (template_code IS NOT NULL AND mime_type='application/pdf' "
            "AND (enquiry_id IS NOT NULL OR deal_id IS NOT NULL))) AND "
            "(purpose='generated' OR template_code IS NULL)",
            name="document_purpose",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    origin_contact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), index=True
    )
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"), index=True
    )
    property_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("property.id", ondelete="RESTRICT"), index=True
    )
    deal_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("deal.id", ondelete="RESTRICT"), index=True
    )
    enquiry_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("enquiry.id", ondelete="RESTRICT"), index=True
    )
    template_code: Mapped[str | None] = mapped_column(String(40))
    filename: Mapped[str] = mapped_column(String(180))
    mime_type: Mapped[str] = mapped_column(String(120))
    purpose: Mapped[str] = mapped_column(
        String(20), default="attachment", server_default="attachment"
    )
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentVersion(Base):
    __tablename__ = "document_version"
    __table_args__ = (
        CheckConstraint("sha256 IS NULL OR octet_length(sha256)=32", name="document_sha256_length"),
        CheckConstraint(
            "state IN ('awaiting_upload','pending_scan','clean','rejected')",
            name="document_scan_state",
        ),
        CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="document_version_size"),
        CheckConstraint(
            "(state='awaiting_upload')=(sha256 IS NULL)", name="document_version_hash_state"
        ),
        CheckConstraint(
            "(state IN ('clean','rejected'))=(scanned_at IS NOT NULL)", name="document_verdict_time"
        ),
        Index("ix_document_version_document_created", "document_id", "created_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(ForeignKey("document.id", ondelete="RESTRICT"))
    object_key: Mapped[UUID] = mapped_column(unique=True, default=uuid4)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[bytes | None] = mapped_column(LargeBinary(32))
    state: Mapped[str] = mapped_column(String(24), default="awaiting_upload")
    scan_error: Mapped[str | None] = mapped_column(String(40))
    scanner_version: Mapped[str | None] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FilePermit(Base):
    __tablename__ = "file_permit"
    __table_args__ = (
        CheckConstraint(
            "octet_length(token_hash)=32 AND octet_length(session_proof_hash)=32",
            name="file_permit_hash_lengths",
        ),
        CheckConstraint("action IN ('upload','download')", name="file_permit_action"),
        CheckConstraint("size_bytes>0 AND size_bytes<=20971520", name="file_permit_size"),
        CheckConstraint(
            "expires_at>created_at AND expires_at<=created_at+interval '5 minutes'",
            name="file_permit_lifetime",
        ),
        Index("ix_file_permit_expiry", "expires_at", "consumed_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    token_hash: Mapped[bytes] = mapped_column(LargeBinary(32), unique=True)
    session_proof_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("session.id", ondelete="RESTRICT"), index=True
    )
    version_id: Mapped[UUID] = mapped_column(
        ForeignKey("document_version.id", ondelete="RESTRICT"), index=True
    )
    action: Mapped[str] = mapped_column(String(16))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FileReceipt(Base):
    __tablename__ = "file_command_receipt"
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    key: Mapped[UUID] = mapped_column(primary_key=True)
    operation: Mapped[str] = mapped_column(String(100))
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    document_id: Mapped[UUID] = mapped_column(
        ForeignKey("document.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OutboxEvent(Base):
    __tablename__ = "outbox_event"
    __table_args__ = (
        CheckConstraint(
            "schedule_version IS NULL OR dedupe_key=kind||':'||"
            "coalesce(visit_id,task_id)::text||':'||schedule_version::text",
            name="outbox_reminder_key",
        ),
        CheckConstraint(
            "(website_receipt_id IS NULL AND ((export_id IS NULL AND "
            "((kind='file.scan' AND version_id IS NOT NULL "
            "AND inventory_event_id IS NULL "
            "AND visit_id IS NULL AND task_id IS NULL AND schedule_version IS NULL "
            "AND due_at IS NULL) OR "
            "(kind IN ('inventory.reservation.created','inventory.reservation.released',"
            "'inventory.outcome.created','inventory.outcome.reopened') "
            "AND version_id IS NULL AND inventory_event_id IS NOT NULL AND visit_id IS NULL "
            "AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL) OR "
            "(kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL "
            "AND task_id IS NULL AND version_id IS NULL AND inventory_event_id IS NULL "
            "AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL) OR "
            "(kind='task.due' AND task_id IS NOT NULL AND visit_id IS NULL "
            "AND version_id IS NULL AND inventory_event_id IS NULL "
            "AND schedule_version IS NOT NULL AND schedule_version>0 AND due_at IS NOT NULL))) OR "
            "(kind='export.generate' AND export_id IS NOT NULL AND version_id IS NULL "
            "AND inventory_event_id IS NULL AND visit_id IS NULL AND task_id IS NULL "
            "AND schedule_version IS NULL AND due_at IS NULL))) OR "
            "(kind='website.process' AND website_receipt_id IS NOT NULL AND export_id IS NULL "
            "AND version_id IS NULL AND inventory_event_id IS NULL AND visit_id IS NULL "
            "AND task_id IS NULL AND schedule_version IS NULL AND due_at IS NULL)",
            name="outbox_typed_parent",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    kind: Mapped[str] = mapped_column(String(60))
    website_receipt_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("website_receipt.id", ondelete="RESTRICT"), unique=True
    )
    export_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("export_job.id", ondelete="RESTRICT"), unique=True
    )
    version_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("document_version.id", ondelete="RESTRICT"), unique=True
    )
    inventory_event_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("inventory_event.id", ondelete="RESTRICT"), unique=True
    )
    visit_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("visit.id", ondelete="RESTRICT"), index=True
    )
    task_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("task.id", ondelete="RESTRICT"), index=True
    )
    schedule_version: Mapped[int | None] = mapped_column(BigInteger)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dedupe_key: Mapped[str] = mapped_column(String(160), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Job(Base):
    __tablename__ = "job"
    __table_args__ = (
        CheckConstraint(
            "state IN ('ready','running','retry','done','failed','invalidated')", name="job_state"
        ),
        CheckConstraint("attempts>=0 AND attempts<=5", name="job_attempts"),
        CheckConstraint(
            "(state='running' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR "
            "(state<>'running' AND lease_token IS NULL AND lease_until IS NULL)",
            name="job_lease",
        ),
        Index("ix_job_available", "state", "available_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    outbox_id: Mapped[UUID] = mapped_column(
        ForeignKey("outbox_event.id", ondelete="RESTRICT"), unique=True
    )
    state: Mapped[str] = mapped_column(String(16), default="ready")
    attempts: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    lease_token: Mapped[UUID | None]
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(40))


class Notification(Base):
    __tablename__ = "notification"
    __table_args__ = (
        CheckConstraint(
            "schedule_version IS NULL OR event_key=kind||':'||"
            "coalesce(visit_id,task_id)::text||':'||schedule_version::text",
            name="notification_reminder_key",
        ),
        Index("uq_notification_user_event", "user_id", "event_key", unique=True),
        Index("ix_notification_user_created", "user_id", "created_at", "id"),
        CheckConstraint(
            "(kind='file.scanned' AND document_id IS NOT NULL AND visit_id IS NULL "
            "AND task_id IS NULL AND schedule_version IS NULL) OR "
            "(kind IN ('visit.reminder.day','visit.reminder.hour') AND visit_id IS NOT NULL "
            "AND document_id IS NULL AND task_id IS NULL AND schedule_version IS NOT NULL "
            "AND schedule_version>0) OR (kind='task.due' AND task_id IS NOT NULL "
            "AND document_id IS NULL AND visit_id IS NULL AND schedule_version IS NOT NULL "
            "AND schedule_version>0)",
            name="notification_typed_parent",
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    event_key: Mapped[str] = mapped_column(String(160))
    document_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("document.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(60), server_default="file.scanned")
    visit_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("visit.id", ondelete="RESTRICT"), index=True
    )
    task_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("task.id", ondelete="RESTRICT"), index=True
    )
    schedule_version: Mapped[int | None] = mapped_column(BigInteger)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
