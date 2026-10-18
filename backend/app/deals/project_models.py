"""Client project interests are distinct from reserved or transacted inventory."""

from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, SmallInteger, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class DealProject(Base):
    __tablename__ = "deal_project"
    __table_args__ = (
        CheckConstraint("position BETWEEN 1 AND 3", name="deal_project_position"),
        CheckConstraint(
            "num_nonnulls(development_id,property_id,external_name)=1",
            name="deal_project_target",
        ),
        CheckConstraint("length(btrim(name))>0", name="deal_project_name"),
        CheckConstraint(
            "external_name IS NULL OR length(btrim(external_name))>0",
            name="deal_project_external_name",
        ),
        Index(
            "uq_deal_project_development",
            "deal_id",
            "development_id",
            unique=True,
            postgresql_where=text("development_id IS NOT NULL"),
        ),
        Index(
            "uq_deal_project_property",
            "deal_id",
            "property_id",
            unique=True,
            postgresql_where=text("property_id IS NOT NULL"),
        ),
        Index(
            "uq_deal_project_external",
            "deal_id",
            text("lower(btrim(external_name))"),
            unique=True,
            postgresql_where=text("external_name IS NOT NULL"),
        ),
    )
    deal_id: Mapped[UUID] = mapped_column(
        ForeignKey("deal.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    development_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("development.id", ondelete="RESTRICT"),
        index=True,
    )
    property_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("property.id", ondelete="RESTRICT"),
        index=True,
    )
    external_name: Mapped[str | None] = mapped_column(String(160))
    name: Mapped[str] = mapped_column(String(160))
