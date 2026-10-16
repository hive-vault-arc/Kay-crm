"""One stock boundary for scoped deal commands and safe shared availability facts."""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, aliased

from app.deals.contracts import ReleaseReservation, Reserve
from app.deals.models import Deal
from app.files.models import OutboxEvent
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.hierarchy_models import Development
from app.inventory.history import record
from app.inventory.models import Offering, Property
from app.inventory.reservation_models import Reservation


def active_hold(session: Session, did: UUID) -> Reservation | None:
    return session.scalar(
        select(Reservation).where(Reservation.deal_id == did, Reservation.released_at.is_(None))
    )


def shared_conflicts(session: Session, offerings: Sequence[Offering]) -> dict[UUID, str | None]:
    parents = dict(
        session.execute(
            select(Property.id, Property.development_id).where(
                Property.id.in_([o.property_id for o in offerings if o.property_id])
            )
        ).all()
    )
    development_ids = {
        o.development_id or (parents.get(o.property_id) if o.property_id else None)
        for o in offerings
    }
    development_ids.discard(None)
    held = session.execute(
        select(
            Offering.id,
            Offering.kind,
            Offering.development_id,
            Property.development_id.label("parent"),
        )
        .join(Reservation, Reservation.offering_id == Offering.id)
        .outerjoin(Property, Property.id == Offering.property_id)
        .where(
            Reservation.released_at.is_(None),
            or_(
                Offering.id.in_([o.id for o in offerings]),
                Offering.development_id.in_(development_ids),
                Property.development_id.in_(development_ids),
            ),
        )
    ).all()
    result: dict[UUID, str | None] = {}
    for offering in offerings:
        parent = offering.development_id or (
            parents.get(offering.property_id) if offering.property_id else None
        )
        if any(row.id == offering.id for row in held):
            result[offering.id] = "RESERVATION_CONFLICT"
        elif any(
            row.kind == offering.kind
            and parent
            and (row.development_id == parent or offering.development_id and row.parent == parent)
            for row in held
        ):
            result[offering.id] = "DEVELOPMENT_OVERLAP"
        else:
            result[offering.id] = None
    return result


def conflict(
    session: Session, offering: Offering, *, exclude_deal: UUID | None = None
) -> str | None:
    other, prop = aliased(Offering), aliased(Property)
    pid = offering.property_id
    development = offering.development_id or (
        session.scalar(select(Property.development_id).where(Property.id == pid)) if pid else None
    )
    overlap = [other.id == offering.id]
    if development:
        overlap.append(other.development_id == development)
        if offering.development_id:
            overlap.append(prop.development_id == development)
    query = (
        select(other.id)
        .join(Reservation, Reservation.offering_id == other.id)
        .outerjoin(prop, prop.id == other.property_id)
        .where(Reservation.released_at.is_(None), other.kind == offering.kind, or_(*overlap))
    )
    if exclude_deal:
        query = query.where(Reservation.deal_id != exclude_deal)
    found = session.scalars(query).all()
    if offering.id in found:
        return "RESERVATION_CONFLICT"
    return "DEVELOPMENT_OVERLAP" if found else None


def locked_stock(
    session: Session, oid: UUID
) -> tuple[Offering, Property | Development, Development | None]:
    snapshot = session.get(Offering, oid)
    if snapshot is None:
        raise IdentityError("NOT_FOUND", 404)
    pid, whole = snapshot.property_id, snapshot.development_id
    parent_id = whole or (
        session.scalar(select(Property.development_id).where(Property.id == pid)) if pid else None
    )
    parent = (
        session.scalar(select(Development).where(Development.id == parent_id).with_for_update())
        if parent_id
        else None
    )
    item = (
        session.scalar(select(Property).where(Property.id == pid).with_for_update())
        if pid
        else parent
    )
    if item is None or (isinstance(item, Property) and item.development_id != parent_id):
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    affected = [Offering.id == oid]
    if pid:
        affected.append(Offering.property_id == pid)
    if parent_id:
        affected.append(Offering.development_id == parent_id)
        if whole:
            affected.append(
                Offering.property_id.in_(
                    select(Property.id).where(Property.development_id == parent_id)
                )
            )
    session.scalars(
        select(Offering)
        .where(or_(*affected))
        .order_by(Offering.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).all()
    session.refresh(item)
    if parent:
        session.refresh(parent)
    return snapshot, item, parent


def apply(
    session: Session, identity: CurrentIdentity, deal: Deal, body: Reserve | ReleaseReservation
) -> str:
    from app.inventory.commands import available, bump

    if deal.offering_id != body.offering_id:
        raise IdentityError("DEAL_TARGET_CHANGED", 409)
    offering, target, parent = locked_stock(session, body.offering_id)
    hold = active_hold(session, deal.id)
    releasing = isinstance(body, ReleaseReservation)
    if not releasing:
        code = conflict(session, offering)
        if code:
            raise IdentityError(code, 409)
    elif hold is None:
        raise IdentityError("RESERVATION_NOT_ACTIVE", 409)
    if (
        offering.version != body.expected_offering_version
        or target.version != body.expected_target_version
        or body.expected_development_version
        != (parent.version if isinstance(target, Property) and parent else None)
    ):
        raise IdentityError("INVENTORY_VERSION_CONFLICT", 409)
    if parent and parent.archived_at is not None:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if not offering.is_current or offering.state != ("reserved" if releasing else "available"):
        raise IdentityError("OFFERING_NOT_AVAILABLE", 409)
    available(session, target, offering)
    offering.state = "available" if releasing else "reserved"
    offering.version += 1
    bump(target)
    session.flush()
    action = "reservation.released" if releasing else "reservation.created"
    reason = body.reason if isinstance(body, ReleaseReservation) else ""
    eid = record(session, identity, target, "offerings." + action, offering, reason)
    session.add(
        OutboxEvent(
            id=uuid4(),
            kind="inventory." + action,
            inventory_event_id=eid,
            dedupe_key=f"inventory/{eid}",
        )
    )
    if releasing and hold is not None:
        hold.released_at, hold.released_by_user_id = datetime.now(UTC), identity.user.id
        hold.release_reason, hold.release_event_id = reason, eid
        if deal.stage == "reserved":
            deal.stage = hold.previous_stage
    else:
        session.add(
            Reservation(
                deal_id=deal.id,
                offering_id=offering.id,
                previous_stage=deal.stage,
                created_by_user_id=identity.user.id,
                reserve_event_id=eid,
            )
        )
        deal.stage = "reserved"
    return action
