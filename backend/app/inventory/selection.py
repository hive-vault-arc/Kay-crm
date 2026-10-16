"""Safe exact-offering selection; templates label units but never become targets."""

from collections.abc import Callable, Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.inventory.contracts import InventoryQuery
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.models import Offering, Property
from app.inventory.reservations import shared_conflicts


def target_views(session: Session, offerings: Sequence[Offering]) -> dict[UUID, dict[str, object]]:
    properties = {
        p.id: p
        for p in session.scalars(
            select(Property).where(
                Property.id.in_([o.property_id for o in offerings if o.property_id])
            )
        )
    }
    developments = {
        d.id: d
        for d in session.scalars(
            select(Development).where(
                Development.id.in_(
                    [o.development_id for o in offerings if o.development_id]
                    + [p.development_id for p in properties.values() if p.development_id]
                )
            )
        )
    }
    floors = {
        f.id: (f, b)
        for f, b in session.execute(
            select(Floor, Block)
            .join(Block, Block.id == Floor.block_id)
            .where(Floor.id.in_([p.floor_id for p in properties.values() if p.floor_id]))
        )
    }
    types = {
        t.id: t
        for t in session.scalars(
            select(UnitType).where(
                UnitType.id.in_([p.unit_type_id for p in properties.values() if p.unit_type_id])
            )
        )
    }
    result: dict[UUID, dict[str, object]] = {}
    for o in offerings:
        p = properties.get(o.property_id) if o.property_id else None
        did = p.development_id if p else o.development_id
        d = developments.get(did) if did else None
        floor = floors.get(p.floor_id) if p and p.floor_id else None
        template = types.get(p.unit_type_id) if p and p.unit_type_id else None
        target = p or d
        if target is None:
            raise RuntimeError("OFFERING_TARGET_MISSING")
        result[o.id] = {
            "id": str(target.id),
            "version": target.version,
            "development_version": d.version if p and d else None,
            "level": "unit" if p and d else "standalone" if p else "development",
            "reference": target.reference,
            "label": p.marketing_name if p else d.name if d else None,
            "location": target.location,
            "category": p.category if p else None,
            "area_sqm": format(p.area_sqm, ".2f") if p and p.area_sqm is not None else None,
            "rooms": p.rooms if p else None,
            "development_reference": d.reference if d else None,
            "block_code": floor[1].code if floor else None,
            "floor_code": floor[0].code if floor else None,
            "unit_type_code": template.code if template else None,
            "archived": bool(
                (p and p.archived_at is not None) or (d and d.archived_at is not None)
            ),
        }
    return result


def select_offerings(
    session: Session, query: InventoryQuery, projection: Callable[[Offering], dict[str, object]]
) -> dict[str, object]:
    filters = []
    if query.offering_id is not None:
        filters.append(Offering.id == query.offering_id)
    for field in ("property_id", "kind", "development_id"):
        value = getattr(query, field)
        if value is not None:
            # A development filter selects its units as well as its whole offer.
            filters.append(
                or_(Offering.development_id == value, Property.development_id == value)
                if field == "development_id"
                else getattr(Offering, field) == value
            )
    if query.target_level in {"property", "unit", "standalone"}:
        filters.append(Offering.property_id.is_not(None))
    if query.target_level == "unit":
        filters.append(Property.development_id.is_not(None))
    elif query.target_level == "standalone":
        filters.append(Property.development_id.is_(None))
    elif query.target_level == "development":
        filters.append(Offering.development_id.is_not(None))
    if query.state and query.state != "all":
        filters.append(Offering.state == query.state)
    if query.q:
        pattern = "%" + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        filters.append(
            or_(
                *(
                    column.ilike(pattern)
                    for column in (
                        Property.reference,
                        Property.marketing_name,
                        Property.location,
                        Development.reference,
                        Development.name,
                        Development.location,
                    )
                )
            )
        )
    if query.category:
        filters.append(
            or_(
                Property.category == query.category,
                Offering.development_id.in_(
                    select(Property.development_id).where(Property.category == query.category)
                ),
            )
        )
    for field in ("floor_id", "unit_type_id"):
        value = getattr(query, field)
        if value:
            filters.append(getattr(Property, field) == value)
    if query.block_id:
        filters.append(
            Property.floor_id.in_(select(Floor.id).where(Floor.block_id == query.block_id))
        )
    comparison = case(
        (
            Offering.kind == "rental",
            Offering.price_mad * case((Offering.price_period == "month", 12), else_=1),
        ),
        else_=Offering.price_mad,
    )
    if query.min_comparison_mad is not None:
        filters.append(comparison >= Decimal(query.min_comparison_mad))
    if query.max_comparison_mad is not None:
        filters.append(comparison <= Decimal(query.max_comparison_mad))
    if query.min_area_sqm is not None:
        filters.append(Property.area_sqm >= Decimal(query.min_area_sqm))
    if query.min_rooms is not None:
        filters.append(Property.rooms >= query.min_rooms)
    base = (
        select(Offering)
        .outerjoin(Property, Offering.property_id == Property.id)
        .outerjoin(
            Development,
            Development.id == func.coalesce(Offering.development_id, Property.development_id),
        )
        .where(*filters)
    )
    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = session.scalars(
        base.order_by(Offering.created_at.desc(), Offering.id)
        .offset((query.page - 1) * query.page_size)
        .limit(query.page_size)
    ).all()
    targets = target_views(session, rows)
    conflicts = shared_conflicts(session, rows)
    from app.inventory.stock_review import occupied

    occupancy = occupied(session, rows)
    return {
        "items": [
            {
                **projection(o),
                "occupied": o.id in occupancy,
                "target": targets[o.id],
                "reservation_conflict": conflicts[o.id],
            }
            for o in rows
        ],
        "total": total,
        "page": query.page,
        "page_size": query.page_size,
        "has_previous": query.page > 1,
        "has_next": query.page * query.page_size < total,
    }
