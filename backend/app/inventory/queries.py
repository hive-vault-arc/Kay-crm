"""Allowlisted shared facts; owner identity always requires separate current scope."""

from collections.abc import Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ColumnElement, func, or_, select, text, true
from sqlalchemy.orm import Session

from app.contacts.access import contact_scope
from app.contacts.models import Contact
from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.contracts import InventoryQuery, PropertiesQuery
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.models import InventoryEvent, Offering, Property, PropertyOwner
from app.inventory.outcome_history import metadata
from app.inventory.reservations import shared_conflicts
from app.inventory.stock_review import occupied


def money(value: Decimal | None) -> str | None:
    return format(value, ".2f") if value is not None else None


def offering_view(item: Offering) -> dict[str, object]:
    annual = None
    if item.kind == "rental" and item.price_mad is not None:
        annual = item.price_mad * (12 if item.price_period == "month" else 1)
    return {
        "id": str(item.id),
        "property_id": str(item.property_id) if item.property_id else None,
        **({"development_id": str(item.development_id)} if item.development_id else {}),
        "target_level": "property" if item.property_id else "development",
        "kind": item.kind,
        "state": item.state,
        "is_current": item.is_current,
        "version": item.version,
        "price_mad": money(item.price_mad),
        "currency": item.currency,
        "price_period": item.price_period,
        "annual_equivalent_mad": money(annual),
        "conditions": item.conditions,
        "availability_confirmed_at": item.availability_confirmed_at.isoformat()
        if item.availability_confirmed_at
        else None,
        "created_at": item.created_at.isoformat(),
    }


def properties_view(session: Session, items: Sequence[Property]) -> list[dict[str, object]]:
    ids = [item.id for item in items]
    offerings = (
        session.scalars(
            select(Offering)
            .where(Offering.property_id.in_(ids), Offering.is_current)
            .order_by(Offering.kind)
        ).all()
        if ids
        else []
    )
    by_property: dict[UUID, list[dict[str, object]]] = {pid: [] for pid in ids}
    conflicts = shared_conflicts(session, offerings)
    occupancy = occupied(session, offerings)
    for offering in offerings:
        if offering.property_id is not None:
            by_property[offering.property_id].append(
                {
                    **offering_view(offering),
                    "occupied": offering.id in occupancy,
                    "reservation_conflict": conflicts[offering.id],
                }
            )
    developments = {
        row.id: row
        for row in session.scalars(
            select(Development).where(
                Development.id.in_([item.development_id for item in items if item.development_id])
            )
        )
    }
    floor_rows = {
        row[0].id: row
        for row in session.execute(
            select(Floor, Block)
            .join(Block, Block.id == Floor.block_id)
            .where(Floor.id.in_([item.floor_id for item in items if item.floor_id]))
        )
    }
    types = {
        row.id: row
        for row in session.scalars(
            select(UnitType).where(
                UnitType.id.in_([item.unit_type_id for item in items if item.unit_type_id])
            )
        )
    }

    def hierarchy(item: Property) -> dict[str, object]:
        if item.development_id is None:
            return {"rooms": item.rooms} if item.rooms is not None else {}
        development = developments[item.development_id]
        floor_row = floor_rows.get(item.floor_id) if item.floor_id else None
        unit_type = types.get(item.unit_type_id) if item.unit_type_id else None
        return {
            "development_id": str(item.development_id),
            "floor_id": str(item.floor_id) if item.floor_id else None,
            "unit_type_id": str(item.unit_type_id) if item.unit_type_id else None,
            "rooms": item.rooms,
            "hierarchy": {
                "development": {
                    "id": str(development.id),
                    "reference": development.reference,
                    "name": development.name,
                },
                "block": {
                    "id": str(floor_row[1].id),
                    "code": floor_row[1].code,
                    "label": floor_row[1].label,
                }
                if floor_row
                else None,
                "floor": {
                    "id": str(floor_row[0].id),
                    "code": floor_row[0].code,
                    "label": floor_row[0].label,
                }
                if floor_row
                else None,
                "unit_type": {
                    "id": str(unit_type.id),
                    "code": unit_type.code,
                    "label": unit_type.label,
                }
                if unit_type
                else None,
            },
        }

    return [
        {
            "id": str(item.id),
            "reference": item.reference,
            "category": item.category,
            "marketing_name": item.marketing_name,
            "location": item.location,
            "listing_details": item.listing_details or {},
            "area_sqm": money(item.area_sqm),
            "version": item.version,
            "archived_at": item.archived_at.isoformat() if item.archived_at else None,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "offerings": by_property[item.id],
            **hierarchy(item),
        }
        for item in items
    ]


def property_record(session: Session, pid: UUID, *, lock: bool = False) -> Property:
    if lock:
        development_id = session.scalar(select(Property.development_id).where(Property.id == pid))
        if development_id is not None:
            session.scalar(
                select(Development).where(Development.id == development_id).with_for_update()
            )
    query = select(Property).where(Property.id == pid)
    item = session.scalar(query.with_for_update() if lock else query)
    if item is None:
        raise IdentityError("NOT_FOUND", 404)
    return item


def detail(session: Session, identity: CurrentIdentity, pid: UUID) -> dict[str, object]:
    item = property_record(session, pid)
    links = session.scalars(
        select(PropertyOwner)
        .where(PropertyOwner.property_id == pid, PropertyOwner.archived_at.is_(None))
        .order_by(PropertyOwner.created_at, PropertyOwner.id)
    ).all()
    visible = {
        contact.id: contact
        for contact in session.scalars(
            select(Contact).where(
                Contact.id.in_([link.contact_id for link in links]),
                contact_scope(identity),
                Contact.archived_at.is_(None) if identity.user.role == "agent" else true(),
            )
        )
    }
    owners: list[dict[str, object]] = []
    for link in links:
        contact = visible.get(link.contact_id)
        owners.append(
            {
                "marketing_display": link.marketing_display,
                "contact": {"id": str(contact.id), "name": contact.name} if contact else None,
            }
        )
    return {**properties_view(session, [item])[0], "owners": owners}


def read_detail(database: Database, token: str, pid: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        return detail(session, current_identity(session, token), pid)


def numbered(
    items: list[dict[str, object]], total: int, query: InventoryQuery
) -> dict[str, object]:
    return {
        "items": items,
        "total": total,
        "page": query.page,
        "page_size": query.page_size,
        "has_previous": query.page > 1,
        "has_next": query.page * query.page_size < total,
    }


def read_list(
    database: Database, token: str, kind: str, query: InventoryQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        current_identity(session, token)
        if kind == "properties":
            conditions: list[ColumnElement[bool]] = []
            if query.archive != "all":
                conditions.append(
                    Property.archived_at.is_(None)
                    if query.archive == "active"
                    else Property.archived_at.is_not(None)
                )
            if query.q:
                pattern = (
                    "%"
                    + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                    + "%"
                )
                conditions.append(
                    or_(
                        Property.reference.ilike(pattern),
                        Property.marketing_name.ilike(pattern),
                        Property.location.ilike(pattern),
                    )
                )
            if query.development_id:
                conditions.append(Property.development_id == query.development_id)
            if query.floor_id:
                conditions.append(Property.floor_id == query.floor_id)
            if query.unit_type_id:
                conditions.append(Property.unit_type_id == query.unit_type_id)
            if query.block_id:
                conditions.append(
                    Property.floor_id.in_(select(Floor.id).where(Floor.block_id == query.block_id))
                )
            if query.target_level == "standalone":
                conditions.append(Property.development_id.is_(None))
            elif query.target_level == "unit":
                conditions.append(Property.development_id.is_not(None))
            if query.offering_kind or (query.state and query.state != "all"):
                campaign = select(Offering.id).where(Offering.property_id == Property.id)
                if query.offering_kind:
                    campaign = campaign.where(Offering.kind == query.offering_kind)
                if query.state and query.state != "all":
                    campaign = campaign.where(Offering.state == query.state)
                if query.state != "withdrawn":
                    campaign = campaign.where(Offering.is_current)
                conditions.append(campaign.exists())
            if query.property_id:
                conditions.append(Property.id == query.property_id)
            counts = dict.fromkeys(
                (
                    "land",
                    "apartment",
                    "villa",
                    "house",
                    "commercial",
                    "riad",
                    "room",
                    "office",
                    "farm",
                ),
                0,
            )
            for category, count in session.execute(
                select(Property.category, func.count())
                .where(*conditions)
                .group_by(Property.category)
            ):
                counts[category] = count
            unfiltered_total = sum(counts.values())
            if query.category:
                conditions.append(Property.category == query.category)
            if isinstance(query, PropertiesQuery) and query.categories is not None:
                conditions.append(
                    Property.category.in_(query.categories.split(",") if query.categories else [])
                )
            total = (
                session.scalar(select(func.count()).select_from(Property).where(*conditions)) or 0
            )
            order = Property.reference if query.sort == "reference" else Property.updated_at.desc()
            items = session.scalars(
                select(Property)
                .where(*conditions)
                .order_by(order, Property.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            ).all()
            return {
                **numbered(properties_view(session, items), total, query),
                "category_counts": counts,
                "unfiltered_total": unfiltered_total,
            }
        from app.inventory.selection import select_offerings

        return select_offerings(session, query, offering_view)


def read_history(
    database: Database, token: str, pid: UUID, query: InventoryQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        current_identity(session, token)
        property_record(session, pid)
        total = (
            session.scalar(
                select(func.count())
                .select_from(InventoryEvent)
                .where(InventoryEvent.property_id == pid)
            )
            or 0
        )
        events = session.scalars(
            select(InventoryEvent)
            .where(InventoryEvent.property_id == pid)
            .order_by(InventoryEvent.occurred_at.desc(), InventoryEvent.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        stock_metadata = metadata(session, events)
        return numbered(
            [
                {
                    **stock_metadata[row.id],
                    "id": str(row.id),
                    "offering_id": str(row.offering_id) if row.offering_id else None,
                    "actor": {"id": str(row.actor_user_id), "display_name": row.actor_display_name},
                    "action": row.action,
                    "property_version": row.property_version,
                    "offering_version": row.offering_version,
                    "state": row.state,
                    "price_mad": money(row.price_mad),
                    "price_period": row.price_period,
                    "conditions": row.conditions,
                    "reason": row.reason,
                    "occurred_at": row.occurred_at.isoformat(),
                }
                for row in events
            ],
            total,
            query,
        )
