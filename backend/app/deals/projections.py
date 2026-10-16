"""Bounded projections share inventory facts, never private owner/developer identities."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal
from app.identity.models import User
from app.inventory.models import Offering
from app.inventory.queries import money, offering_view
from app.inventory.reservation_models import Reservation
from app.inventory.reservations import shared_conflicts
from app.inventory.selection import target_views
from app.inventory.stock_review import occupied


def deal_views(session: Session, rows: Sequence[Deal]) -> list[dict[str, object]]:
    contacts = {
        c.id: (c, u)
        for c, u in session.execute(
            select(Contact, User)
            .join(User, User.id == Contact.primary_agent_id)
            .where(Contact.id.in_({r.contact_id for r in rows}))
        )
    }
    offerings = list(
        session.scalars(
            select(Offering).where(Offering.id.in_({r.offering_id for r in rows if r.offering_id}))
        )
    )
    targets = target_views(session, offerings)
    stock_conflicts = shared_conflicts(session, offerings)
    occupancy = occupied(session, offerings)
    offers = {
        o.id: {**offering_view(o), "occupied": o.id in occupancy, "target": targets[o.id]}
        for o in offerings
    }
    counts = dict(
        session.execute(
            select(CustomerOffer.deal_id, func.count())
            .where(CustomerOffer.deal_id.in_([r.id for r in rows]))
            .group_by(CustomerOffer.deal_id)
        ).all()
    )
    holds = {
        r.deal_id: r
        for r in session.scalars(
            select(Reservation).where(
                Reservation.deal_id.in_([r.id for r in rows]), Reservation.released_at.is_(None)
            )
        )
    }
    result: list[dict[str, object]] = []
    for row in rows:
        contact, agent = contacts[row.contact_id]
        result.append(
            {
                "id": str(row.id),
                "title": row.title,
                "stage": row.stage,
                "contact": {
                    "id": str(contact.id),
                    "name": contact.name,
                    "primary_agent": {"id": str(agent.id), "display_name": agent.display_name},
                    "archived_at": contact.archived_at.isoformat() if contact.archived_at else None,
                },
                "origin_contact_id": str(row.origin_contact_id),
                "enquiry_id": str(row.enquiry_id) if row.enquiry_id else None,
                "requirement_id": str(row.requirement_id) if row.requirement_id else None,
                "offering": offers.get(row.offering_id) if row.offering_id else None,
                "next_action": row.next_action,
                "stock_review_required": row.stock_review_required,
                "primary_agent_at_close_id": str(row.primary_agent_at_close_id)
                if row.primary_agent_at_close_id
                else None,
                "version": row.version,
                "active_reservation": (
                    {
                        "id": str(holds[row.id].id),
                        "created_by_user_id": str(holds[row.id].created_by_user_id),
                        "created_at": holds[row.id].created_at.isoformat(),
                        "previous_stage": holds[row.id].previous_stage,
                    }
                    if row.id in holds
                    else None
                ),
                "reservation_conflict": None
                if row.id in holds
                else stock_conflicts.get(row.offering_id)
                if row.offering_id
                else None,
                "customer_offer_count": counts.get(row.id, 0),
                "created_by_user_id": str(row.created_by_user_id),
                "updated_by_user_id": str(row.updated_by_user_id),
                "created_at": row.created_at.isoformat(),
                "updated_at": row.updated_at.isoformat(),
            }
        )
    return result


def customer_offer_view(row: CustomerOffer) -> dict[str, object]:
    return {
        "id": str(row.id),
        "deal_id": str(row.deal_id),
        "amount_mad": money(row.amount_mad),
        "currency": row.currency,
        "price_period": row.price_period,
        "annual_amount_mad": money(row.amount_mad * (12 if row.price_period == "month" else 1))
        if row.price_period
        else None,
        "conditions": row.conditions,
        "expires_on": row.expires_on.isoformat() if row.expires_on else None,
        "status": row.status,
        "version": row.version,
        "created_by_user_id": str(row.created_by_user_id),
        "updated_by_user_id": str(row.updated_by_user_id),
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def event_views(session: Session, rows: Sequence[DealStageEvent]) -> list[dict[str, object]]:
    offerings = list(
        session.scalars(
            select(Offering).where(Offering.id.in_({r.offering_id for r in rows if r.offering_id}))
        )
    )
    targets = target_views(session, offerings)
    by_id: dict[UUID, Offering] = {o.id: o for o in offerings}
    return [
        {
            "id": str(row.id),
            "deal_id": str(row.deal_id),
            "contact_id": str(row.contact_id),
            "actor": {"id": str(row.actor_user_id), "display_name": row.actor_name},
            "action": row.action,
            "from_stage": row.from_stage,
            "to_stage": row.to_stage,
            "before_version": row.before_version,
            "after_version": row.after_version,
            "title": row.title,
            "next_action": row.next_action,
            "stock_review_required": row.stock_review_required,
            "offering_id": str(row.offering_id) if row.offering_id else None,
            "target": targets.get(row.offering_id) if row.offering_id in by_id else None,
            "requirement_id": str(row.requirement_id) if row.requirement_id else None,
            "customer_offer_id": str(row.customer_offer_id) if row.customer_offer_id else None,
            "offer_version": row.offer_version,
            "amount_mad": money(row.amount_mad),
            "price_period": row.price_period,
            "conditions": row.conditions,
            "expires_on": row.expires_on.isoformat() if row.expires_on else None,
            "offer_status": row.offer_status,
            "reason": row.reason,
            "occurred_at": row.occurred_at.isoformat(),
        }
        for row in rows
    ]
