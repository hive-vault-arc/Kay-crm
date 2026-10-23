"""Unbounded, reversible catalogue links; timeline records each change."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ProjectLink(Base):
    __tablename__ = "project_link"
    __table_args__ = (
        CheckConstraint("num_nonnulls(enquiry_id,deal_id)=1", name="project_link_parent"),
        CheckConstraint("num_nonnulls(development_id,property_id)=1", name="project_link_target"),
        CheckConstraint("kind IN ('discussed','visited')", name="project_link_kind"),
        CheckConstraint("length(btrim(name))>0", name="project_link_name"),
        CheckConstraint(
            "(removed_at IS NULL) = (removed_by_user_id IS NULL)", name="project_link_removal"
        ),
        Index("ix_project_link_enquiry", "enquiry_id", "kind", "created_at", "id"),
        Index("ix_project_link_deal", "deal_id", "kind", "created_at", "id"),
        Index(
            "uq_project_link_enquiry_development",
            "enquiry_id",
            "kind",
            "development_id",
            unique=True,
            postgresql_where=text("removed_at IS NULL AND development_id IS NOT NULL"),
        ),
        Index(
            "uq_project_link_enquiry_property",
            "enquiry_id",
            "kind",
            "property_id",
            unique=True,
            postgresql_where=text("removed_at IS NULL AND property_id IS NOT NULL"),
        ),
        Index(
            "uq_project_link_deal_development",
            "deal_id",
            "kind",
            "development_id",
            unique=True,
            postgresql_where=text("removed_at IS NULL AND development_id IS NOT NULL"),
        ),
        Index(
            "uq_project_link_deal_property",
            "deal_id",
            "kind",
            "property_id",
            unique=True,
            postgresql_where=text("removed_at IS NULL AND property_id IS NOT NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    enquiry_id: Mapped[UUID | None] = mapped_column(ForeignKey("enquiry.id", ondelete="RESTRICT"))
    deal_id: Mapped[UUID | None] = mapped_column(ForeignKey("deal.id", ondelete="RESTRICT"))
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT")
    )
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey("property.id", ondelete="RESTRICT"))
    kind: Mapped[str] = mapped_column(String(12))
    name: Mapped[str] = mapped_column(String(160))
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    removed_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT")
    )
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
