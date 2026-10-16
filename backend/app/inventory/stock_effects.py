"""Inventory effects and safe competing-deal flags share the caller's transaction."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deals.contracts import ORDINARY_STAGES
from app.deals.history import append_event
from app.deals.models import Deal
from app.files.models import OutboxEvent
from app.identity.sessions import CurrentIdentity
from app.inventory.commands import bump
from app.inventory.hierarchy_models import Development
from app.inventory.history import record
from app.inventory.models import Offering, Property
from app.inventory.reservation_models import Reservation


def event(
    session: Session, identity: CurrentIdentity, offering: Offering, action: str, reason: str
) -> UUID:
    target = (
        session.get(Property, offering.property_id)
        if offering.property_id
        else session.get(Development, offering.development_id)
    )
    if target is None:
        raise RuntimeError("STOCK_TARGET_REQUIRED")
    eid = record(session, identity, target, "offerings." + action, offering, reason)
    session.add(
        OutboxEvent(
            id=uuid4(),
            kind="inventory." + action,
            inventory_event_id=eid,
            dedupe_key=f"inventory/{eid}",
        )
    )
    return eid


def release_hold(
    session: Session, identity: CurrentIdentity, offering: Offering, reason: str
) -> Reservation | None:
    hold = session.scalar(
        select(Reservation).where(
            Reservation.offering_id == offering.id, Reservation.released_at.is_(None)
        )
    )
    if hold is None:
        return None
    target = (
        session.get(Property, offering.property_id)
        if offering.property_id
        else session.get(Development, offering.development_id)
    )
    if target is None:
        raise RuntimeError("STOCK_TARGET_REQUIRED")
    offering.state, offering.version = "available", offering.version + 1
    bump(target)
    eid = event(session, identity, offering, "reservation.released", reason)
    hold.released_at, hold.released_by_user_id = datetime.now(UTC), identity.user.id
    hold.release_reason, hold.release_event_id = reason, eid
    return hold


def flag_deals(
    session: Session,
    identity: CurrentIdentity,
    offering_ids: list[UUID],
    exclude: UUID | None = None,
) -> None:
    rows = session.scalars(
        select(Deal)
        .where(Deal.offering_id.in_(offering_ids), Deal.stage.in_([*ORDINARY_STAGES, "reserved"]))
        .order_by(Deal.id)
        .with_for_update()
    ).all()
    for row in rows:
        if row.id == exclude:
            continue
        previous = row.stage
        if row.stage == "reserved":
            hold = session.scalar(
                select(Reservation)
                .where(Reservation.deal_id == row.id)
                .order_by(Reservation.created_at.desc())
                .limit(1)
            )
            if hold and hold.released_at is not None:
                row.stage = hold.previous_stage
        row.stock_review_required = True
        row.version += 1
        row.updated_at, row.updated_by_user_id = datetime.now(UTC), identity.user.id
        append_event(
            session,
            identity,
            row,
            "stock.flagged",
            previous,
            reason="Le stock lié a changé. Vérification nécessaire.",
        )
