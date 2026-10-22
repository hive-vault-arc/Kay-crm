from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RealtimeTicket(Base):
    __tablename__ = "realtime_ticket"
    digest: Mapped[bytes] = mapped_column(LargeBinary(32), primary_key=True)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class PushSubscription(Base):
    __tablename__ = "push_subscription"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"), index=True)
    endpoint: Mapped[str] = mapped_column(String(2048), unique=True)
    p256dh: Mapped[str] = mapped_column(String(128))
    auth: Mapped[str] = mapped_column(String(64))
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RealtimePresence(Base):
    __tablename__ = "realtime_presence"
    connection_id: Mapped[UUID] = mapped_column(primary_key=True)
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"), index=True)
    seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    visible: Mapped[bool] = mapped_column(default=True)


class PushDelivery(Base):
    __tablename__ = "push_delivery"
    __table_args__ = (UniqueConstraint("notification_id", "subscription_id"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    notification_id: Mapped[UUID] = mapped_column(ForeignKey("notification.id"))
    subscription_id: Mapped[UUID] = mapped_column(ForeignKey("push_subscription.id"))
    session_id: Mapped[UUID] = mapped_column(ForeignKey("session.id"))
    state: Mapped[str] = mapped_column(String(16), default="ready")
    attempts: Mapped[int] = mapped_column(default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
