"""Each committed operation appends an exact snapshot and contact/audit link."""

from sqlalchemy.orm import Session

from app.contacts.history import record
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal
from app.identity.sessions import CurrentIdentity


def append_event(
    session: Session,
    identity: CurrentIdentity,
    row: Deal,
    action: str,
    previous_stage: str | None,
    *,
    reason: str = "",
    offer: CustomerOffer | None = None,
) -> None:
    session.add(
        DealStageEvent(
            deal_id=row.id,
            contact_id=row.contact_id,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            action=action,
            from_stage=previous_stage,
            to_stage=row.stage,
            before_version=row.version - 1,
            after_version=row.version,
            title=row.title,
            next_action=row.next_action,
            stock_review_required=row.stock_review_required,
            offering_id=row.offering_id,
            requirement_id=row.requirement_id,
            reason=reason,
            customer_offer_id=offer.id if offer else None,
            offer_version=offer.version if offer else None,
            amount_mad=offer.amount_mad if offer else None,
            price_period=offer.price_period if offer else None,
            conditions=offer.conditions if offer else None,
            expires_on=offer.expires_on if offer else None,
            offer_status=offer.status if offer else None,
        )
    )
    record(session, identity, row.contact_id, f"deals.{action}", reason=reason, deal_id=row.id)
