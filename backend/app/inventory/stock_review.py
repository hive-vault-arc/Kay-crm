"""Consistent safe stock previews and reviewed fingerprints, never private holders."""

import hashlib
import json
from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.deals.contracts import ReviewedStock
from app.identity.security import IdentityError
from app.inventory.hierarchy_models import Development
from app.inventory.models import Offering, Property
from app.inventory.reservation_models import Reservation
from app.inventory.reservations import locked_stock


def scope(
    session: Session, offering: Offering
) -> tuple[list[Offering], list[Property | Development]]:
    target = (
        session.get(Property, offering.property_id)
        if offering.property_id
        else session.get(Development, offering.development_id)
    )
    if target is None:
        raise IdentityError("NOT_FOUND", 404)
    parent_id = target.development_id if isinstance(target, Property) else target.id
    targets: list[Property | Development] = [target]
    clauses = (
        [Offering.property_id == target.id]
        if isinstance(target, Property)
        else [Offering.development_id == target.id]
    )
    if parent_id:
        parent = session.get(Development, parent_id)
        if parent and isinstance(target, Property):
            targets.append(parent)
            clauses.append(Offering.development_id == parent_id)
        if isinstance(target, Development):
            children = list(
                session.scalars(
                    select(Property)
                    .where(Property.development_id == parent_id)
                    .order_by(Property.id)
                )
            )
            targets.extend(children)
            clauses.append(Offering.property_id.in_([p.id for p in children]))
    offerings = list(session.scalars(select(Offering).where(or_(*clauses)).order_by(Offering.id)))
    return offerings, targets


def fingerprint(session: Session, offering: Offering) -> str:
    offerings, targets = scope(session, offering)
    facts = (
        sorted((str(t.id), t.version) for t in targets),
        [(str(o.id), o.version, o.state, o.is_current) for o in offerings],
    )
    return hashlib.sha256(json.dumps(facts, separators=(",", ":")).encode()).hexdigest()


def reviewed(session: Session, body: ReviewedStock) -> tuple[Offering, Property | Development]:
    if body.offering_id is None:
        raise IdentityError("DEAL_TARGET_REQUIRED", 422)
    offering, target, parent = locked_stock(session, body.offering_id)
    if (
        offering.version != body.expected_offering_version
        or target.version != body.expected_target_version
        or body.expected_development_version
        != (parent.version if parent and isinstance(target, Property) else None)
        or fingerprint(session, offering) != body.expected_stock_fingerprint
    ):
        raise IdentityError("STOCK_REVIEW_CHANGED", 409)
    if parent and parent.archived_at is not None:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    return offering, target


def occupied(session: Session, offerings: Sequence[Offering]) -> set[UUID]:
    parents = dict(
        session.execute(
            select(Property.id, Property.development_id).where(
                Property.id.in_([o.property_id for o in offerings if o.property_id])
            )
        ).all()
    )
    developments = {
        o.development_id or (parents.get(o.property_id) if o.property_id else None)
        for o in offerings
    }
    developments.discard(None)
    rented = session.execute(
        select(
            Offering.property_id, Offering.development_id, Property.development_id.label("parent")
        )
        .outerjoin(Property, Property.id == Offering.property_id)
        .where(
            Offering.state == "rented",
            or_(
                Offering.property_id.in_(parents),
                Offering.development_id.in_(developments),
                Property.development_id.in_(developments),
            ),
        )
    ).all()
    return {
        o.id
        for o in offerings
        if any(
            (
                o.property_id
                and (
                    r.property_id == o.property_id
                    or (r.development_id and r.development_id == parents.get(o.property_id))
                )
            )
            or (
                o.development_id
                and (r.development_id == o.development_id or r.parent == o.development_id)
            )
            for r in rented
        )
    }


def close_conflict(
    session: Session, offering: Offering, deal_id: UUID | None, *, external: bool = False
) -> str | None:
    offerings, _ = scope(session, offering)
    holds = {
        h.offering_id: h.deal_id
        for h in session.scalars(
            select(Reservation).where(
                Reservation.offering_id.in_([o.id for o in offerings]),
                Reservation.released_at.is_(None),
            )
        )
    }
    if offering.development_id:
        children = [o for o in offerings if o.property_id]
        if any(o.state in {"sold", "rented"} for o in children):
            return "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED"
        if any(o.id in holds for o in children):
            return (
                "DEVELOPMENT_OVERLAP"
                if any(o.kind == offering.kind and o.id in holds for o in children)
                else "STOCK_REVIEW_REQUIRED"
            )
    else:
        parents = [o for o in offerings if o.development_id]
        if any(
            o.id in holds or o.state == "sold" or (o.kind == offering.kind and o.state == "rented")
            for o in parents
        ):
            return "STOCK_REVIEW_REQUIRED"
    if not external and offering.id in holds and holds[offering.id] != deal_id:
        return "RESERVATION_CONFLICT"
    if not offering.is_current or offering.state not in {"available", "reserved"}:
        return "STOCK_REVIEW_REQUIRED"
    return None


def marketability(session: Session, offering: Offering) -> None:
    offerings, _ = scope(session, offering)
    if offering.state in {"sold", "rented", "review"}:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if offering.development_id and any(
        o.property_id and o.state in {"sold", "rented"} for o in offerings
    ):
        raise IdentityError("PARTIAL_DEVELOPMENT_REVIEW_REQUIRED", 409)
    if any(
        o.id != offering.id
        and o.state == "sold"
        and (o.property_id == offering.property_id or o.development_id)
        for o in offerings
    ):
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    if offering.property_id and any(
        o.development_id and o.kind == offering.kind and o.state == "rented" for o in offerings
    ):
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)


def effects_plan(session: Session, offering: Offering) -> list[tuple[Offering, str]]:
    offerings, _ = scope(session, offering)
    effects = [(offering, "sold" if offering.kind == "sale" else "rented")]
    for other in offerings:
        if other.id == offering.id or not other.is_current or other.state in {"sold", "rented"}:
            continue
        same = (
            other.property_id == offering.property_id
            and other.development_id == offering.development_id
        )
        child = bool(offering.development_id and other.property_id)
        parent_scope = bool(offering.property_id and other.development_id)
        if (same and offering.kind == "sale" and other.kind in {"rental", "holiday"}) or (
            child and (offering.kind == "sale" or other.kind in {"rental", "holiday"})
        ):
            effects.append((other, "withdrawn"))
        elif parent_scope and other.state != "review":
            effects.append((other, "review"))
    return effects


def preview(
    session: Session, offering: Offering, deal_id: UUID | None, *, external: bool = False
) -> dict[str, object]:
    _, targets = scope(session, offering)
    target = next(t for t in targets if t.id == (offering.property_id or offering.development_id))
    parent = next(
        (t for t in targets if isinstance(t, Development) and isinstance(target, Property)), None
    )
    effects = effects_plan(session, offering)
    return {
        "offering_id": str(offering.id),
        "expected_offering_version": offering.version,
        "expected_target_version": target.version,
        "expected_development_version": parent.version if parent else None,
        "expected_stock_fingerprint": fingerprint(session, offering),
        "conflict": close_conflict(session, offering, deal_id, external=external),
        "effect_count": len(effects),
        "effects": effect_facts(session, effects[:50]),
    }


def effect_facts(
    session: Session, effects: Sequence[tuple[Offering, str]]
) -> list[dict[str, object]]:
    from app.inventory.selection import target_views

    targets = target_views(session, [o for o, _ in effects])
    return [
        {
            "offering_id": str(o.id),
            "kind": o.kind,
            "target_level": targets[o.id]["level"],
            "reference": targets[o.id]["reference"],
            "label": targets[o.id]["label"],
            "before": o.state,
            "after": after,
            "releases_reservation": o.state == "reserved",
        }
        for o, after in effects
    ]
