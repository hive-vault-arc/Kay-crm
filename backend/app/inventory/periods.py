"""Calendar stock shares the physical inventory lock order and audit trail."""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import Select, func, or_, select, text
from sqlalchemy.orm import Session

from app.db.session import Database
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.hierarchy_models import Development
from app.inventory.history import record
from app.inventory.models import Offering, Property
from app.inventory.period_contracts import CancelPeriod, SavePeriod
from app.inventory.period_models import PropertyPeriod
from app.inventory.queries import property_record
from app.inventory.reservation_models import Reservation
from app.schedule.rules import ZONE


def today() -> date:
    return datetime.now(ZONE).date()


def range_rows(pid: UUID, start: date, end: date) -> Select[PropertyPeriod]:
    return select(PropertyPeriod).where(
        PropertyPeriod.property_id == pid,
        PropertyPeriod.cancelled_at.is_(None),
        func.daterange(PropertyPeriod.start_on, PropertyPeriod.end_on).op("&&")(
            func.daterange(start, end)
        ),
    )


def upcoming_period(
    session: Session, target: Property | Development, *, bookings_only: bool
) -> bool:
    properties = (
        PropertyPeriod.property_id == target.id
        if isinstance(target, Property)
        else PropertyPeriod.property_id.in_(
            select(Property.id).where(Property.development_id == target.id)
        )
    )
    filters = [properties, PropertyPeriod.cancelled_at.is_(None), PropertyPeriod.end_on > today()]
    if bookings_only:
        filters.append(PropertyPeriod.kind == "booking")
    return session.scalar(select(PropertyPeriod.id).where(*filters).limit(1)) is not None


def undated_block(session: Session, item: Property) -> str | None:
    scope = [Offering.property_id == item.id]
    if item.development_id:
        scope.append(Offering.development_id == item.development_id)
    active_hold = (
        select(Reservation.id)
        .where(Reservation.offering_id == Offering.id, Reservation.released_at.is_(None))
        .exists()
    )
    rows = session.scalars(
        select(Offering.state).where(
            or_(*scope),
            or_(
                Offering.state == "sold",
                (Offering.kind != "sale") & ((Offering.state == "rented") | active_hold),
            ),
        )
    ).all()
    states = set(rows)
    if "sold" in states:
        return "sold"
    if "rented" in states:
        return "rented"
    return "hold" if rows else None


def read_calendar(database: Database, token: str, pid: UUID, month: date) -> dict[str, object]:
    next_month = (month.replace(day=28) + timedelta(days=4)).replace(day=1)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        item = property_record(session, pid)
        can_manage = identity.user.role in {"manager", "administrator"}
        rows = session.scalars(range_rows(pid, month, next_month).order_by(PropertyPeriod.start_on))
        return {
            "property_id": str(pid),
            "version": item.version,
            "month": month.isoformat(),
            "today": today().isoformat(),
            "undated_block": undated_block(session, item),
            "items": [
                {
                    "id": str(row.id),
                    "kind": row.kind,
                    "start_on": row.start_on.isoformat(),
                    "end_on": row.end_on.isoformat(),
                    "note": row.note if can_manage else None,
                }
                for row in rows
            ],
        }


def describe(kind: str, start: date, end: date) -> str:
    label = "Réservation" if kind == "booking" else "Fermeture"
    return f"{label} du {start:%d/%m/%Y} au {end:%d/%m/%Y} (fin exclue)"


def apply_period(
    session: Session,
    identity: CurrentIdentity,
    pid: UUID,
    period_id: UUID | None,
    body: SavePeriod | CancelPeriod,
) -> tuple[Property, UUID]:
    from app.inventory.commands import bump, check_version

    item = property_record(session, pid, lock=True)
    parent = session.get(Development, item.development_id) if item.development_id else None
    if item.archived_at or (parent and parent.archived_at):
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    row = session.get(PropertyPeriod, period_id) if period_id else None
    if period_id and (row is None or row.property_id != pid):
        raise IdentityError("NOT_FOUND", 404)
    check_version(item.version, body.expected_version)
    if row and row.cancelled_at:
        raise IdentityError("PROPERTY_PERIOD_CANCELLED", 409)
    old = describe(row.kind, row.start_on, row.end_on) if row else ""
    if isinstance(body, CancelPeriod):
        if row is None:
            raise IdentityError("NOT_FOUND", 404)
        bump(item)
        eid = record(session, identity, item, "properties.period.cancelled", reason=old)
        row.cancelled_at, row.cancel_event_id = datetime.now(UTC), eid
        row.cancellation_reason = body.reason
        return item, eid

    if body.end_on > today() and undated_block(session, item):
        raise IdentityError("PROPERTY_PERIOD_UNDATED_BLOCK", 409)
    overlaps = range_rows(pid, body.start_on, body.end_on)
    if row:
        overlaps = overlaps.where(PropertyPeriod.id != row.id)
    if session.scalar(overlaps.limit(1)):
        raise IdentityError("PROPERTY_PERIOD_OVERLAP", 409)
    bump(item)
    new = describe(body.kind, body.start_on, body.end_on)
    action = "properties.period.updated" if row else "properties.period.created"
    eid = record(session, identity, item, action, reason=f"{old} → {new}" if old else new)
    if row is None:
        row = PropertyPeriod(property_id=pid, create_event_id=eid)
        session.add(row)
    row.kind, row.start_on, row.end_on, row.note = body.kind, body.start_on, body.end_on, body.note
    return item, eid
