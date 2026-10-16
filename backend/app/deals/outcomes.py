"""Explicit commercial close and reopen retain outcomes and current authority."""

from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.deals.contracts import ORDINARY_STAGES, CloseDeal, ReopenDeal
from app.deals.models import Deal
from app.deals.outcome_models import DealOutcome, DealReopening
from app.identity.models import User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.outcomes import close_stock, reopen_stock
from app.inventory.reservations import active_hold
from app.inventory.stock_effects import release_hold
from app.inventory.stock_review import reviewed


def apply(
    session: Session,
    identity: CurrentIdentity,
    deal: Deal,
    contact: Contact,
    body: CloseDeal | ReopenDeal,
) -> str:
    if deal.offering_id != body.offering_id:
        raise IdentityError("DEAL_TARGET_CHANGED", 409)
    offering = reviewed(session, body)[0] if deal.offering_id else None
    if isinstance(body, CloseDeal):
        primary = session.get(User, contact.primary_agent_id)
        if primary is None:
            raise IdentityError("INVALID_DEAL_CONTEXT", 409)
        if deal.stage not in (*ORDINARY_STAGES, "reserved"):
            raise IdentityError("DEAL_ALREADY_CLOSED", 409)
        outcome = DealOutcome(
            id=uuid4(),
            deal_id=deal.id,
            offering_id=deal.offering_id,
            outcome=body.outcome,
            agreed_amount_mad=Decimal(body.agreed_amount_mad) if body.agreed_amount_mad else None,
            price_period=offering.price_period if offering else None,
            completed_on=body.completed_on,
            explanation=body.explanation,
            primary_agent_at_close_id=contact.primary_agent_id,
            primary_agent_at_close_name=primary.display_name,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            previous_stage=deal.stage,
            close_version=deal.version + 1,
        )
        session.add(outcome)
        session.flush()
        if body.outcome == "won":
            if offering is None:
                raise IdentityError("DEAL_TARGET_REQUIRED", 422)
            close_stock(
                session,
                identity,
                offering,
                body.completed_on,
                deal_id=deal.id,
                deal_outcome_id=outcome.id,
            )
        elif active_hold(session, deal.id) and offering:
            release_hold(
                session, identity, offering, "Réservation libérée par la clôture de son affaire."
            )
        deal.stage = body.outcome
        deal.primary_agent_at_close_id = contact.primary_agent_id
        deal.stock_review_required = False
        return "closed"
    if deal.stage not in {"won", "lost", "cancelled"}:
        raise IdentityError("DEAL_NOT_CLOSED", 409)
    previous_outcome = session.scalar(
        select(DealOutcome)
        .where(DealOutcome.deal_id == deal.id)
        .order_by(DealOutcome.close_version.desc())
        .limit(1)
    )
    if previous_outcome is None or session.scalar(
        select(DealReopening.id).where(DealReopening.outcome_id == previous_outcome.id)
    ):
        raise IdentityError("DEAL_NOT_CLOSED", 409)
    reopening = DealReopening(
        id=uuid4(),
        deal_id=deal.id,
        outcome_id=previous_outcome.id,
        actor_user_id=identity.user.id,
        actor_name=identity.user.display_name,
        reason=body.reason,
        reopen_version=deal.version + 1,
    )
    session.add(reopening)
    session.flush()
    if previous_outcome.outcome == "won":
        if offering is None:
            raise IdentityError("STOCK_REVIEW_REQUIRED", 409)
        reopen_stock(session, identity, offering, previous_outcome.id, reopening)
    # Lost/cancelled reopenings do not claim stock and never resurrect an old hold.
    deal.stage, deal.stock_review_required = "negotiation", False
    return "reopened"
