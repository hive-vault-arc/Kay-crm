"""Permanent catalogue removal keeps stable IDs for commercial evidence."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class PropertyIdentity(Base):
    __tablename__ = "property_identity"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, server_default="{}")


class DevelopmentIdentity(Base):
    __tablename__ = "development_identity"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, server_default="{}")


class BlobDeletion(Base):
    __tablename__ = "inventory_blob_deletion"
    object_key: Mapped[UUID] = mapped_column(primary_key=True)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    attempts: Mapped[int] = mapped_column(server_default="0")
    last_error: Mapped[str | None] = mapped_column(String(40))
