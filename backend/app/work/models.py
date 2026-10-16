"""Contact-scoped tasks keep immutable origins and versioned actor history."""

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
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Task(Base):
    __tablename__ = "task"
    __table_args__ = (
        CheckConstraint("status IN ('open','completed','cancelled')", name="task_status"),
        CheckConstraint("version>0 AND schedule_version>0", name="task_versions"),
        CheckConstraint("length(btrim(title))>0", name="task_title"),
        Index("ix_task_owner_due_status", "owner_user_id", "due_at", "status", "id"),
        Index("ix_task_contact_due", "contact_id", "due_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    origin_contact_id: Mapped[UUID] = mapped_column(ForeignKey("contact.id", ondelete="RESTRICT"))
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(160))
    notes: Mapped[str] = mapped_column(String(1000), server_default="")
    outcome: Mapped[str] = mapped_column(String(1000), server_default="")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), server_default="open")
    version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    schedule_version: Mapped[int] = mapped_column(BigInteger, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TaskEvent(Base):
    __tablename__ = "task_event"
    __table_args__ = (
        CheckConstraint(
            "action IN ('created','updated','completed','cancelled','contact_merged')",
            name="task_event_action",
        ),
        CheckConstraint("version>0", name="task_event_version"),
        Index("ix_task_event_version", "task_id", "version", unique=True),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(ForeignKey("task.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    actor_name: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(24))
    version: Mapped[int] = mapped_column(BigInteger)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TaskReceipt(Base):
    __tablename__ = "task_command_receipt"
    __table_args__ = (CheckConstraint("octet_length(request_hash)=32", name="task_receipt_hash"),)
    actor_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), primary_key=True
    )
    route: Mapped[str] = mapped_column(String(100), primary_key=True)
    key: Mapped[UUID] = mapped_column(primary_key=True)
    task_id: Mapped[UUID] = mapped_column(ForeignKey("task.id", ondelete="RESTRICT"))
    request_hash: Mapped[bytes] = mapped_column(LargeBinary(32))
    result: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
