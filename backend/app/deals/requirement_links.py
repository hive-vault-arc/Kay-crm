"""Reject only research changes that would invalidate existing deal commitments."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deals.models import CustomerOffer, Deal
from app.identity.security import IdentityError
from app.inventory.models import Offering


def check_requirement_intent(session: Session, rid: UUID, intent: str) -> None:
    incompatible_target = session.scalar(
        select(Deal.id)
        .join(Offering, Offering.id == Deal.offering_id)
        .where(Deal.requirement_id == rid, Offering.kind != intent)
        .limit(1)
    )
    incompatible_proposal = session.scalar(
        select(CustomerOffer.id)
        .join(Deal, Deal.id == CustomerOffer.deal_id)
        .where(
            Deal.requirement_id == rid,
            CustomerOffer.price_period.is_not(None)
            if intent == "sale"
            else CustomerOffer.price_period.is_(None),
        )
        .limit(1)
    )
    if incompatible_target or incompatible_proposal:
        raise IdentityError("REQUIREMENT_INTENT_IN_USE", 409)
