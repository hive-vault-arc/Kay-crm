"""Authorize the current contact first; link validation never discloses another portfolio."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.contacts.models import Contact, Enquiry
from app.deals.contracts import DealFields
from app.deals.models import CustomerOffer, Deal
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.models import Offering
from app.requirements.models import Requirement


def authorized(session: Session, identity: CurrentIdentity, did: UUID) -> Deal:
    row = session.get(Deal, did)
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    readable_contact(session, identity, row.contact_id)
    return row


def writable(session: Session, identity: CurrentIdentity, row: Deal) -> Contact:
    contact = readable_contact(session, identity, row.contact_id)
    if row.archived_at is not None:
        raise IdentityError("RECORD_ARCHIVED", 409)
    if contact.archived_at is not None:
        raise IdentityError("CONTACT_ARCHIVED", 409)
    return contact


def context_kind(session: Session, row: Deal) -> str | None:
    if row.offering_id:
        offering = session.get(Offering, row.offering_id)
        return offering.kind if offering else None
    requirement = session.get(Requirement, row.requirement_id) if row.requirement_id else None
    return requirement.intent if requirement else None


def check_period(kind: str | None, period: str | None) -> None:
    if kind is not None and ((kind == "sale") != (period is None)):
        raise IdentityError("DEAL_OFFER_PERIOD_MISMATCH", 422)


def check_links(
    session: Session,
    identity: CurrentIdentity,
    contact: Contact,
    body: DealFields,
    *,
    enquiry_id: UUID | None = None,
    did: UUID | None = None,
) -> None:
    requirement = None
    if body.requirement_id:
        requirement = session.scalar(
            select(Requirement).where(
                Requirement.id == body.requirement_id, Requirement.contact_id == contact.id
            )
        )
        if requirement is None:
            raise IdentityError("INVALID_DEAL_CONTEXT", 422)
    if enquiry_id:
        enquiry = session.scalar(
            select(Enquiry).where(Enquiry.id == enquiry_id, Enquiry.contact_id == contact.id)
        )
        if (
            enquiry is None
            or enquiry.archived_at is not None
            or (identity.user.role == "agent" and enquiry.assigned_agent_id is None)
        ):
            raise IdentityError("INVALID_DEAL_CONTEXT", 422)
    offering = session.get(Offering, body.offering_id) if body.offering_id else None
    if body.offering_id and offering is None:
        raise IdentityError("NOT_FOUND", 404)
    if offering and offering.kind == "holiday":
        raise IdentityError("HOLIDAY_DEAL_NOT_SUPPORTED", 422)
    if offering and offering.version != body.expected_offering_version:
        raise IdentityError("OFFERING_VERSION_CONFLICT", 409)
    if requirement and offering and requirement.intent != offering.kind:
        raise IdentityError("OFFERING_INTENT_MISMATCH", 422)
    kind = offering.kind if offering else requirement.intent if requirement else None
    if did:
        for period in session.scalars(
            select(CustomerOffer.price_period).where(CustomerOffer.deal_id == did)
        ):
            check_period(kind, period)
