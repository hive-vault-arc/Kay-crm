"""Scoped owner portfolio built from the existing legal-owner links."""

from typing import Literal
from uuid import UUID

from pydantic import Field
from sqlalchemy import func, literal, select, text, union_all
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import Subquery

from app.contacts.access import readable_contact
from app.contacts.contracts import StrictBody
from app.contacts.models import ContactRole
from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.hierarchy_models import Development, DevelopmentOwner
from app.inventory.models import Property, PropertyOwner


class OwnerPortfolioQuery(StrictBody):
    page: int = Field(default=1, ge=1, le=1000000)
    page_size: int = Field(default=20, ge=1, le=50)
    status: Literal["current", "past"] = "current"


def owner_links(contact_id: UUID) -> Subquery:
    return union_all(
        select(
            literal("property").label("kind"),
            PropertyOwner.id.label("link_id"),
            PropertyOwner.property_id.label("asset_id"),
            PropertyOwner.created_at.label("linked_at"),
            PropertyOwner.archived_at.label("unlinked_at"),
        ).where(PropertyOwner.contact_id == contact_id),
        select(
            literal("development").label("kind"),
            DevelopmentOwner.id.label("link_id"),
            DevelopmentOwner.development_id.label("asset_id"),
            DevelopmentOwner.created_at.label("linked_at"),
            DevelopmentOwner.archived_at.label("unlinked_at"),
        ).where(DevelopmentOwner.contact_id == contact_id),
    ).subquery()


def portfolio_in_session(
    session: Session, identity: CurrentIdentity, target: UUID, query: OwnerPortfolioQuery
) -> dict[str, object]:
    contact = readable_contact(session, identity, target)
    links = owner_links(contact.id)
    tagged = session.scalar(
        select(ContactRole.contact_id).where(
            ContactRole.contact_id == contact.id, ContactRole.role == "owner"
        )
    )
    if tagged is None and not session.scalar(select(links.c.link_id).limit(1)):
        raise IdentityError("NOT_FOUND", 404)
    condition = (
        links.c.unlinked_at.is_(None)
        if query.status == "current"
        else links.c.unlinked_at.is_not(None)
    )
    total = session.scalar(select(func.count()).select_from(links).where(condition)) or 0
    rows = session.execute(
        select(links)
        .where(condition)
        .order_by(links.c.linked_at.desc(), links.c.link_id.desc())
        .offset((query.page - 1) * query.page_size)
        .limit(query.page_size)
    ).all()
    properties = {
        item.id: item
        for item in session.scalars(
            select(Property).where(
                Property.id.in_([row.asset_id for row in rows if row.kind == "property"])
            )
        )
    }
    developments = {
        item.id: item
        for item in session.scalars(
            select(Development).where(
                Development.id.in_([row.asset_id for row in rows if row.kind == "development"])
            )
        )
    }
    items: list[dict[str, object]] = []
    for row in rows:
        asset: Property | Development
        if row.kind == "property":
            asset = properties[row.asset_id]
            name = asset.marketing_name
        else:
            asset = developments[row.asset_id]
            name = asset.name
        items.append(
            {
                "link_id": str(row.link_id),
                "kind": row.kind,
                "id": str(asset.id),
                "reference": asset.reference,
                "name": name,
                "category": asset.category,
                "location": asset.location,
                "asset_archived_at": asset.archived_at.isoformat() if asset.archived_at else None,
                "linked_at": row.linked_at.isoformat(),
                "unlinked_at": row.unlinked_at.isoformat() if row.unlinked_at else None,
            }
        )
    return {
        "items": items,
        "page": query.page,
        "page_size": query.page_size,
        "total": total,
        "has_next": query.page * query.page_size < total,
        "has_previous": query.page > 1,
    }


def read_owner_portfolio(
    database: Database, token: str, target: UUID, query: OwnerPortfolioQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        return portfolio_in_session(session, current_identity(session, token), target, query)
