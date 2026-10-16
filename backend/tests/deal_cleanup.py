"""FK-ordered deal cleanup called only by verified isolated synthetic fixture teardown."""

from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.contacts.history_models import TimelineEvent
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal, DealReceipt
from app.deals.outcome_models import DealOutcome, DealReopening
from app.files.models import OutboxEvent
from app.identity.models import AuditEvent
from app.inventory.models import Offering
from app.inventory.outcome_models import StockEffect, StockOutcome, StockReversal
from app.inventory.reservation_models import Reservation


def actor_deal_ids(
    session: Session,
    uid: UUID,
    contacts: list[UUID],
    properties: list[UUID],
    developments: list[UUID],
) -> list[UUID]:
    inventory = select(Offering.id).where(
        or_(Offering.property_id.in_(properties), Offering.development_id.in_(developments))
    )
    return list(
        session.scalars(
            select(Deal.id).where(
                or_(
                    Deal.created_by_user_id == uid,
                    Deal.contact_id.in_(contacts),
                    Deal.origin_contact_id.in_(contacts),
                    Deal.offering_id.in_(inventory),
                    Deal.id.in_(
                        select(DealStageEvent.deal_id).where(
                            or_(
                                DealStageEvent.actor_user_id == uid,
                                DealStageEvent.offering_id.in_(inventory),
                            )
                        )
                    ),
                    Deal.id.in_(
                        select(CustomerOffer.deal_id).where(CustomerOffer.created_by_user_id == uid)
                    ),
                )
            )
        )
    )


def delete_actor_deals(
    session: Session,
    uid: UUID,
    contacts: list[UUID],
    properties: list[UUID],
    developments: list[UUID],
) -> None:
    ids = actor_deal_ids(session, uid, contacts, properties, developments)
    inventory = select(Offering.id).where(
        or_(Offering.property_id.in_(properties), Offering.development_id.in_(developments))
    )
    outcomes = select(DealOutcome.id).where(DealOutcome.deal_id.in_(ids))
    stocks = select(StockOutcome.id).where(
        or_(
            StockOutcome.deal_outcome_id.in_(outcomes),
            StockOutcome.offering_id.in_(inventory),
            StockOutcome.actor_user_id == uid,
        )
    )
    effect_ids = select(StockEffect.id).where(StockEffect.outcome_id.in_(stocks))
    event_ids = list(
        session.scalars(
            select(StockEffect.inventory_event_id).where(StockEffect.id.in_(effect_ids))
        )
    )
    event_ids += list(
        session.scalars(
            select(StockReversal.inventory_event_id).where(StockReversal.effect_id.in_(effect_ids))
        )
    )
    session.execute(delete(OutboxEvent).where(OutboxEvent.inventory_event_id.in_(event_ids)))
    session.execute(delete(StockReversal).where(StockReversal.effect_id.in_(effect_ids)))
    session.execute(delete(StockEffect).where(StockEffect.outcome_id.in_(stocks)))
    session.execute(delete(StockOutcome).where(StockOutcome.id.in_(stocks)))
    session.execute(delete(DealReopening).where(DealReopening.deal_id.in_(ids)))
    session.execute(delete(DealOutcome).where(DealOutcome.deal_id.in_(ids)))
    holds = session.scalars(select(Reservation).where(Reservation.deal_id.in_(ids))).all()
    events = [eid for r in holds for eid in (r.reserve_event_id, r.release_event_id) if eid]
    session.execute(delete(OutboxEvent).where(OutboxEvent.inventory_event_id.in_(events)))
    session.execute(delete(Reservation).where(Reservation.deal_id.in_(ids)))
    session.execute(delete(AuditEvent).where(AuditEvent.deal_id.in_(ids)))
    session.execute(delete(TimelineEvent).where(TimelineEvent.deal_id.in_(ids)))
    session.execute(
        delete(DealReceipt).where(or_(DealReceipt.deal_id.in_(ids), DealReceipt.actor_id == uid))
    )
    session.execute(delete(DealStageEvent).where(DealStageEvent.deal_id.in_(ids)))
    session.execute(delete(CustomerOffer).where(CustomerOffer.deal_id.in_(ids)))
    session.execute(delete(Deal).where(Deal.id.in_(ids)))
