"""Bounded selected-dashboard previews; counts always precede the preview limit."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Select, func, literal, or_, select, union_all
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import CTE

from app.contacts.models import Contact, Enquiry
from app.deals.models import Deal
from app.identity.models import User
from app.inventory.hierarchy_models import Development
from app.inventory.models import Offering, Property
from app.reports.workspace_contracts import WorkspaceQuery
from app.reports.workspace_sources import bounds, linked_targets, open_tasks
from app.schedule.models import Visit
from app.schedule.rules import ZONE
from app.work.models import Task


def upcoming(session: Session, source: Select[*tuple[Any, ...]], total: int) -> dict[str, object]:
    ids = source.with_only_columns(Visit.id)
    rows = session.execute(
        select(
            Visit.id,
            Visit.title,
            Visit.type,
            Visit.status,
            Visit.start_at,
            Visit.end_at,
            Visit.location,
            Visit.property_id,
            Contact.name.label("contact_name"),
            User.display_name.label("organizer_name"),
        )
        .join(Contact, Contact.id == Visit.contact_id)
        .join(User, User.id == Visit.organizer_user_id)
        .where(Visit.id.in_(ids))
        .order_by(Visit.start_at, Visit.id)
        .limit(2)
    ).mappings()
    return {
        "total": total,
        "items": [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "type": row["type"],
                "status": row["status"],
                "start_at": row["start_at"].isoformat(),
                "end_at": row["end_at"].isoformat(),
                "start_local": row["start_at"].astimezone(ZONE).isoformat(),
                "end_local": row["end_at"].astimezone(ZONE).isoformat(),
                "location": row["location"],
                "property_id": str(row["property_id"]) if row["property_id"] else None,
                "contact_name": row["contact_name"],
                "organizer_name": row["organizer_name"],
            }
            for row in rows
        ],
    }


def follow_ups(session: Session, source: Select[*tuple[Any, ...]], total: int) -> dict[str, object]:
    ids = source.with_only_columns(Enquiry.id)
    rows = session.execute(
        select(
            Enquiry.id,
            Enquiry.received_at,
            Contact.name,
            User.display_name.label("agent_name"),
        )
        .join(Contact, Contact.id == Enquiry.contact_id)
        .join(User, User.id == Contact.primary_agent_id)
        .where(Enquiry.id.in_(ids))
        .order_by(Enquiry.received_at, Enquiry.id)
        .limit(3)
    ).mappings()
    return {
        "total": total,
        "items": [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "agent_name": row["agent_name"],
                "received_at": row["received_at"].isoformat(),
            }
            for row in rows
        ],
    }


def tasks(session: Session, contacts: CTE, clock: datetime) -> dict[str, object]:
    source = open_tasks(contacts)
    total, overdue = session.execute(
        source.with_only_columns(
            func.count(),
            func.count().filter(Task.due_at < clock),
        )
    ).one()
    rows = session.execute(
        source.with_only_columns(
            Task.id,
            Task.title,
            Task.due_at,
            Task.contact_id,
            Task.deal_id,
            Task.enquiry_id,
            User.display_name.label("owner_name"),
        )
        .join(User, User.id == Task.owner_user_id)
        .order_by(Task.due_at, Task.id)
        .limit(3)
    ).mappings()
    return {
        "total": total,
        "overdue_total": overdue,
        "items": [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "owner_name": row["owner_name"],
                "due_at": row["due_at"].isoformat(),
                "due_local": row["due_at"].astimezone(ZONE).isoformat(),
                "href": (
                    f"/deals/{row['deal_id']}"
                    if row["deal_id"]
                    else f"/leads/{row['enquiry_id']}"
                    if row["enquiry_id"]
                    else f"/contacts/{row['contact_id']}"
                )
                + f"?task={row['id']}",
            }
            for row in rows
        ],
    }


def inventory(session: Session, contacts: CTE) -> dict[str, object]:
    links = linked_targets(contacts)
    properties = (
        select(
            Property.id,
            literal("property").label("kind"),
            Property.reference,
            func.coalesce(func.nullif(Property.marketing_name, ""), Property.reference).label(
                "label"
            ),
            Property.category,
            func.coalesce(Property.location, Development.location).label("location"),
            func.count(func.distinct(links.c.deal_id)).label("deal_count"),
        )
        .join(links, links.c.property_id == Property.id)
        .outerjoin(Development, Development.id == Property.development_id)
        .where(
            Property.archived_at.is_(None),
            or_(Property.development_id.is_(None), Development.archived_at.is_(None)),
        )
        .group_by(Property.id, Development.location)
    )
    developments = (
        select(
            Development.id,
            literal("development").label("kind"),
            Development.reference,
            Development.name.label("label"),
            Development.category,
            Development.location,
            func.count(func.distinct(links.c.deal_id)).label("deal_count"),
        )
        .join(links, links.c.development_id == Development.id)
        .where(Development.archived_at.is_(None))
        .group_by(Development.id)
    )
    source = union_all(properties, developments).subquery()
    total = session.scalar(select(func.count()).select_from(source)) or 0
    targets = (
        session.execute(
            select(source)
            .order_by(source.c.deal_count.desc(), source.c.label, source.c.kind, source.c.id)
            .limit(3)
        )
        .mappings()
        .all()
    )
    pids = [row["id"] for row in targets if row["kind"] == "property"]
    dids = [row["id"] for row in targets if row["kind"] == "development"]
    campaigns: dict[tuple[str, object], list[dict[str, object]]] = {}
    if targets:
        offers = session.scalars(
            select(Offering)
            .where(
                Offering.is_current.is_(True),
                or_(Offering.property_id.in_(pids), Offering.development_id.in_(dids)),
            )
            .order_by(Offering.kind, Offering.id)
        )
        for offer in offers:
            key = (
                ("property", offer.property_id)
                if offer.property_id
                else ("development", offer.development_id)
            )
            campaigns.setdefault(key, []).append(
                {
                    "id": str(offer.id),
                    "kind": offer.kind,
                    "state": offer.state,
                    "price_mad": format(Decimal(offer.price_mad), ".2f")
                    if offer.price_mad is not None
                    else None,
                    "price_period": offer.price_period,
                }
            )
    return {
        "total": total,
        "items": [
            {
                "id": str(row["id"]),
                "kind": row["kind"],
                "reference": row["reference"],
                "label": row["label"],
                "category": row["category"],
                "location": row["location"],
                "deal_count": row["deal_count"],
                "campaigns": campaigns.get((row["kind"], row["id"]), []),
            }
            for row in targets
        ],
    }


def team_source(contacts: CTE, query: WorkspaceQuery, clock: datetime) -> Select[*tuple[Any, ...]]:
    lower, upper = bounds(query, clock)
    cids = select(contacts.c.id)
    enquiries = (
        select(Contact.primary_agent_id.label("agent"), func.count().label("total"))
        .join(
            Enquiry,
            Enquiry.contact_id == Contact.id,
        )
        .where(
            Contact.id.in_(cids),
            Enquiry.archived_at.is_(None),
            Enquiry.received_at >= lower,
            Enquiry.received_at < upper,
        )
        .group_by(Contact.primary_agent_id)
        .subquery()
    )
    deals = (
        select(Contact.primary_agent_id.label("agent"), func.count().label("total"))
        .join(
            Deal,
            Deal.contact_id == Contact.id,
        )
        .where(
            Contact.id.in_(cids),
            Deal.archived_at.is_(None),
            Deal.created_at >= lower,
            Deal.created_at < upper,
        )
        .group_by(Contact.primary_agent_id)
        .subquery()
    )
    return (
        select(
            User.id,
            User.display_name,
            func.coalesce(enquiries.c.total, 0).label("enquiries"),
            func.coalesce(deals.c.total, 0).label("deals"),
        )
        .outerjoin(enquiries, enquiries.c.agent == User.id)
        .outerjoin(deals, deals.c.agent == User.id)
        .where(
            User.id.in_(select(Contact.primary_agent_id).where(Contact.id.in_(cids))),
        )
    )


def team(
    session: Session, contacts: CTE, query: WorkspaceQuery, clock: datetime
) -> dict[str, object]:
    source = team_source(contacts, query, clock)
    total = session.scalar(select(func.count()).select_from(source.subquery())) or 0
    rows = session.execute(source.order_by(User.display_name, User.id).limit(3)).mappings()
    return {"total": total, "items": [dict(row, id=str(row["id"])) for row in rows]}
