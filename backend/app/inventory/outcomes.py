"""Atomic stock dispositions and guarded reversals; no financial side effects."""

from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deals.outcome_models import DealReopening
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.commands import available, bump
from app.inventory.hierarchy_models import Development
from app.inventory.models import Offering, Property
from app.inventory.outcome_models import StockEffect, StockOutcome, StockReversal
from app.inventory.stock_effects import event, flag_deals, release_hold
from app.inventory.stock_review import close_conflict, effects_plan, fingerprint, scope


def close_stock(
    session: Session,
    identity: CurrentIdentity,
    offering: Offering,
    completed_on: date,
    *,
    deal_id: UUID | None = None,
    deal_outcome_id: UUID | None = None,
    explanation: str = "Résultat KAY enregistré.",
) -> UUID:
    code = close_conflict(session, offering, deal_id, external=deal_id is None)
    if code:
        raise IdentityError(code, 409)
    target = (
        session.get(Property, offering.property_id)
        if offering.property_id
        else session.get(Development, offering.development_id)
    )
    if target is None:
        raise IdentityError("NOT_FOUND", 404)
    available(session, target, offering)
    oid = uuid4()
    effects: list[StockEffect] = []
    planned = effects_plan(session, offering)
    # Shared stock history must never copy a private deal's explanation or buyer.
    safe_reason = (
        explanation
        if deal_id is None
        else "Résultat KAY : vente."
        if offering.kind == "sale"
        else "Résultat KAY : location."
    )
    for item, state in planned:
        release_hold(session, identity, item, "Réservation libérée par le résultat du stock.")
        effect = StockEffect(
            id=uuid4(),
            outcome_id=oid,
            offering_id=item.id,
            before_state=item.state,
            before_current=item.is_current,
            before_version=item.version,
            after_state=state,
            after_current=state != "withdrawn",
            after_version=item.version + 1,
        )
        item.state, item.is_current, item.version = state, state != "withdrawn", item.version + 1
        physical = (
            session.get(Property, item.property_id)
            if item.property_id
            else session.get(Development, item.development_id)
        )
        if physical is None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        bump(physical)
        effect.inventory_event_id = event(session, identity, item, "outcome.created", safe_reason)
        effects.append(effect)
    if isinstance(target, Property) and target.development_id:
        parent = session.get(Development, target.development_id)
        if parent:
            bump(parent)
    session.flush()
    session.add(
        StockOutcome(
            id=oid,
            deal_outcome_id=deal_outcome_id,
            offering_id=offering.id,
            completed_on=completed_on,
            explanation=safe_reason,
            actor_user_id=identity.user.id,
            after_fingerprint=fingerprint(session, offering),
        )
    )
    session.flush()
    session.add_all(effects)
    affected, _ = scope(session, offering)
    flag_deals(session, identity, [o.id for o in affected], deal_id)
    return next(e.inventory_event_id for e in effects if e.offering_id == offering.id)


def reopen_stock(
    session: Session,
    identity: CurrentIdentity,
    offering: Offering,
    outcome_id: UUID,
    reopening: DealReopening,
) -> None:
    stock = session.scalar(select(StockOutcome).where(StockOutcome.deal_outcome_id == outcome_id))
    if stock is None or fingerprint(session, offering) != stock.after_fingerprint:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    effects = session.scalars(
        select(StockEffect)
        .where(StockEffect.outcome_id == stock.id)
        .order_by(StockEffect.offering_id)
    ).all()
    if not effects:
        raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
    restored: list[tuple[StockEffect, Offering, Property | Development]] = []
    for effect in effects:
        item = session.get(Offering, effect.offering_id)
        if (
            item is None
            or item.version != effect.after_version
            or item.state != effect.after_state
            or item.is_current != effect.after_current
        ):
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        if session.scalar(select(StockReversal.id).where(StockReversal.effect_id == effect.id)):
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        item.state = "available" if effect.before_state == "reserved" else effect.before_state
        item.is_current, item.version = effect.before_current, item.version + 1
        physical = (
            session.get(Property, item.property_id)
            if item.property_id
            else session.get(Development, item.development_id)
        )
        if physical is None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        bump(physical)
        restored.append((effect, item, physical))
    for effect, item, physical in restored:
        if item.state == "available":
            available(session, physical, item)
        eid = event(
            session,
            identity,
            item,
            "outcome.reopened",
            "Stock réexaminé lors d’une réouverture KAY.",
        )
        session.add(
            StockReversal(effect_id=effect.id, reopening_id=reopening.id, inventory_event_id=eid)
        )
    target = session.get(Property, offering.property_id) if offering.property_id else None
    if target and target.development_id:
        parent = session.get(Development, target.development_id)
        if parent:
            bump(parent)
    affected, _ = scope(session, offering)
    flag_deals(session, identity, [o.id for o in affected], reopening.deal_id)
