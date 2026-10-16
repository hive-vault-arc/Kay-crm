"""Safe bounded hierarchy pages, with no protected contact expansion by linkage."""

from typing import cast
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.contacts.access import contact_scope
from app.contacts.models import Contact
from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.contracts import InventoryQuery
from app.inventory.hierarchy_models import Block, Development, DevelopmentOwner, Floor, UnitType
from app.inventory.hierarchy_rules import development_record
from app.inventory.models import InventoryEvent, Offering, Property
from app.inventory.outcome_history import metadata
from app.inventory.queries import money, numbered, offering_view, properties_view
from app.inventory.reservations import shared_conflicts
from app.inventory.stock_review import occupied


def scoped_contact(
    session: Session, identity: CurrentIdentity, cid: UUID | None
) -> dict[str, str] | None:
    if cid is None:
        return None
    contact = session.scalar(select(Contact).where(Contact.id == cid, contact_scope(identity)))
    if contact is None or (identity.user.role == "agent" and contact.archived_at is not None):
        return None
    return {"id": str(contact.id), "name": contact.name}


def summary(session: Session, items: list[Development]) -> list[dict[str, object]]:
    ids = [item.id for item in items]
    offerings: dict[UUID, list[dict[str, object]]] = {did: [] for did in ids}
    rows = session.scalars(
        select(Offering)
        .where(Offering.development_id.in_(ids), Offering.is_current)
        .order_by(Offering.kind)
    ).all()
    conflicts = shared_conflicts(session, rows)
    occupancy = occupied(session, rows)
    for offering in rows:
        if offering.development_id is None:
            raise IdentityError("INVALID_HIERARCHY", 422)
        offerings[offering.development_id].append(
            {
                **offering_view(offering),
                "occupied": offering.id in occupancy,
                "reservation_conflict": conflicts[offering.id],
            }
        )
    counts = dict(
        session.execute(
            select(Property.development_id, func.count())
            .where(Property.development_id.in_(ids))
            .group_by(Property.development_id)
        ).all()
    )
    available = dict(
        session.execute(
            select(Property.development_id, func.count())
            .where(
                Property.development_id.in_(ids),
                select(Offering.id)
                .where(Offering.property_id == Property.id, Offering.state == "available")
                .exists(),
            )
            .group_by(Property.development_id)
        ).all()
    )
    return [
        {
            "id": str(item.id),
            "reference": item.reference,
            "name": item.name,
            "category": item.category,
            "location": item.location,
            "version": item.version,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "archived_at": item.archived_at.isoformat() if item.archived_at else None,
            "unit_count": counts.get(item.id, 0),
            "available_unit_count": available.get(item.id, 0),
            "offerings": offerings[item.id],
        }
        for item in items
    ]


def detail(session: Session, identity: CurrentIdentity, did: UUID) -> dict[str, object]:
    item = development_record(session, did)
    links = session.scalars(
        select(DevelopmentOwner)
        .where(DevelopmentOwner.development_id == did, DevelopmentOwner.archived_at.is_(None))
        .order_by(DevelopmentOwner.created_at, DevelopmentOwner.id)
    ).all()
    # At most 100 owners; scope before returning any identity, never copy private text.
    contacts = {
        row.id: row
        for row in session.scalars(
            select(Contact).where(
                Contact.id.in_([link.contact_id for link in links]), contact_scope(identity)
            )
        )
    }
    owners = []
    for link in links:
        contact = contacts.get(link.contact_id)
        visible = contact is not None and (
            identity.user.role != "agent" or contact.archived_at is None
        )
        owners.append(
            {
                "marketing_display": link.marketing_display,
                "contact": {"id": str(contact.id), "name": contact.name}
                if visible and contact
                else None,
            }
        )
    return {
        **summary(session, [item])[0],
        "briefing_text": item.briefing_text,
        "developer": {
            "marketing_display": item.developer_marketing_display,
            "contact": scoped_contact(session, identity, item.developer_contact_id),
        },
        "owners": owners,
    }


def level_view(row: Block | Floor | UnitType) -> dict[str, object]:
    result: dict[str, object] = {"id": str(row.id), "code": row.code, "label": row.label}
    if isinstance(row, Floor):
        result.update(block_id=str(row.block_id), display_order=row.display_order)
    else:
        result["development_id"] = str(row.development_id)
        if isinstance(row, Block):
            result["display_order"] = row.display_order
        else:
            result.update(
                category=row.category,
                default_area_sqm=money(row.default_area_sqm),
                default_rooms=row.default_rooms,
            )
    return result


def read_hierarchy(
    database: Database, token: str, operation: str, target: UUID | None, query: InventoryQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        model: type[Block] | type[Floor] | type[UnitType]
        if operation == "detail":
            if target is None:
                raise IdentityError("NOT_FOUND", 404)
            return detail(session, identity, target)
        if operation == "developments":
            filters: list[ColumnElement[bool]] = []
            if query.archive != "all":
                filters.append(
                    Development.archived_at.is_(None)
                    if query.archive == "active"
                    else Development.archived_at.is_not(None)
                )
            if query.q:
                pattern = (
                    "%"
                    + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                    + "%"
                )
                filters.append(
                    or_(
                        Development.reference.ilike(pattern),
                        Development.name.ilike(pattern),
                        Development.location.ilike(pattern),
                    )
                )
            if query.category:
                filters.append(Development.category == query.category)
            if (query.state and query.state != "all") or query.offering_kind:
                campaign = select(Offering.id).where(Offering.development_id == Development.id)
                if query.state and query.state != "all":
                    campaign = campaign.where(Offering.state == query.state)
                if query.offering_kind:
                    campaign = campaign.where(Offering.kind == query.offering_kind)
                if query.state != "withdrawn":
                    campaign = campaign.where(Offering.is_current)
                filters.append(campaign.exists())
            total = (
                session.scalar(select(func.count()).select_from(Development).where(*filters)) or 0
            )
            order = (
                Development.reference
                if query.sort == "reference"
                else Development.updated_at.desc()
            )
            rows = session.scalars(
                select(Development)
                .where(*filters)
                .order_by(order, Development.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            ).all()
            return numbered(summary(session, list(rows)), total, query)
        if operation in {"blocks", "unit-types", "history", "owners", "inventory"}:
            if target is None:
                raise IdentityError("NOT_FOUND", 404)
            item = development_record(session, target)
            if operation == "owners":
                return {
                    "owners": detail(session, identity, target)["owners"],
                    "version": item.version,
                }
            if operation == "history":
                filters_history = InventoryEvent.development_id == target
                total = (
                    session.scalar(
                        select(func.count()).select_from(InventoryEvent).where(filters_history)
                    )
                    or 0
                )
                rows_history = session.scalars(
                    select(InventoryEvent)
                    .where(filters_history)
                    .order_by(InventoryEvent.occurred_at.desc(), InventoryEvent.id)
                    .offset((query.page - 1) * query.page_size)
                    .limit(query.page_size)
                ).all()
                stock_metadata = metadata(session, rows_history)
                return numbered(
                    [
                        {
                            **stock_metadata[row.id],
                            "id": str(row.id),
                            "offering_id": str(row.offering_id) if row.offering_id else None,
                            "actor": {
                                "id": str(row.actor_user_id),
                                "display_name": row.actor_display_name,
                            },
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
                        for row in rows_history
                    ],
                    total,
                    query,
                )
            if operation == "inventory":
                conditions = [Property.development_id == target]
                if query.archive != "all":
                    conditions.append(
                        Property.archived_at.is_(None)
                        if query.archive == "active"
                        else Property.archived_at.is_not(None)
                    )
                if query.floor_id:
                    conditions.append(Property.floor_id == query.floor_id)
                if query.block_id:
                    conditions.append(
                        Property.floor_id.in_(
                            select(Floor.id).where(Floor.block_id == query.block_id)
                        )
                    )
                if query.unit_type_id:
                    conditions.append(Property.unit_type_id == query.unit_type_id)
                if query.category:
                    conditions.append(Property.category == query.category)
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
                        )
                    )
                if (query.state and query.state != "all") or query.offering_kind:
                    campaign = select(Offering.id).where(Offering.property_id == Property.id)
                    if query.state and query.state != "all":
                        campaign = campaign.where(Offering.state == query.state)
                    if query.offering_kind:
                        campaign = campaign.where(Offering.kind == query.offering_kind)
                    if query.state != "withdrawn":
                        campaign = campaign.where(Offering.is_current)
                    conditions.append(campaign.exists())
                total = (
                    session.scalar(select(func.count()).select_from(Property).where(*conditions))
                    or 0
                )
                units = session.scalars(
                    select(Property)
                    .where(*conditions)
                    .order_by(Property.reference, Property.id)
                    .offset((query.page - 1) * query.page_size)
                    .limit(query.page_size)
                ).all()
                return {
                    **numbered(properties_view(session, units), total, query),
                    "development": summary(session, [item])[0],
                }
            model = Block if operation == "blocks" else UnitType
            filters_level = model.development_id == target
        elif operation == "floors":
            block = session.get(Block, target)
            if block is None:
                raise IdentityError("NOT_FOUND", 404)
            model = Floor
            filters_level = Floor.block_id == target
        else:
            raise IdentityError("NOT_FOUND", 404)
        total = session.scalar(select(func.count()).select_from(model).where(filters_level)) or 0
        order_level = (
            model.code
            if model is UnitType
            else Block.display_order
            if model is Block
            else Floor.display_order
        )
        rows_level = session.scalars(
            select(model)
            .where(filters_level)
            .order_by(order_level, model.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return numbered(
            [level_view(cast(Block | Floor | UnitType, row)) for row in rows_level], total, query
        )
