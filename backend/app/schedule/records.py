"""Current contact authority controls details; participant membership grants no access."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.access import has_scope, readable_contact
from app.contacts.history import record
from app.contacts.models import Contact
from app.contacts.work_context import enquiry_context
from app.deals.models import Deal
from app.identity.models import User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.models import Property
from app.schedule.contracts import VisitFields
from app.schedule.models import Visit, VisitEvent, VisitParticipant
from app.schedule.rules import ZONE


def authorized(
    session: Session, identity: CurrentIdentity, vid: UUID, *, write: bool = False
) -> Visit:
    row = session.get(Visit, vid)
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    contact = readable_contact(session, identity, row.contact_id)
    if write and contact.archived_at:
        raise IdentityError("CONTACT_ARCHIVED", 409)
    return row


def check_context(
    session: Session, identity: CurrentIdentity, row: Visit, fields: VisitFields, *, new: bool
) -> UUID | None:
    contact = readable_contact(session, identity, row.contact_id)
    if contact.archived_at:
        raise IdentityError("CONTACT_ARCHIVED", 409)
    if any(not has_scope(session, uid, contact) for uid in fields.participant_ids):
        raise IdentityError("INVALID_VISIT_PARTICIPANT", 422)
    if fields.deal_id:
        deal = session.get(Deal, fields.deal_id)
        if deal is None or deal.contact_id != contact.id or deal.archived_at is not None:
            raise IdentityError("INVALID_VISIT_CONTEXT", 422)
    if fields.property_id:
        target = session.get(Property, fields.property_id)
        if target is None:
            raise IdentityError("INVALID_VISIT_CONTEXT", 422)
    return enquiry_context(
        session,
        identity,
        row.contact_id,
        fields.enquiry_id or (row.enquiry_id if not new and not fields.deal_id else None),
        fields.deal_id,
        required=new,
        current_enquiry_id=None if new else row.enquiry_id,
    )


def participants(session: Session, vid: UUID) -> list[UUID]:
    return list(
        session.scalars(
            select(VisitParticipant.user_id)
            .where(VisitParticipant.visit_id == vid)
            .order_by(VisitParticipant.user_id)
        )
    )


def snapshot(session: Session, row: Visit) -> dict[str, object]:
    return {
        "contact_id": str(row.contact_id),
        "origin_contact_id": str(row.origin_contact_id),
        "organizer_user_id": str(row.organizer_user_id),
        "title": row.title,
        "type": row.type,
        "status": row.status,
        "start_at": row.start_at.isoformat(),
        "end_at": row.end_at.isoformat(),
        "location": row.location,
        "deal_id": str(row.deal_id) if row.deal_id else None,
        "enquiry_id": str(row.enquiry_id) if row.enquiry_id else None,
        "property_id": str(row.property_id) if row.property_id else None,
        "participant_ids": [str(uid) for uid in participants(session, row.id)],
        "overlap_reason": row.overlap_reason,
        "outcome": row.outcome,
        "policy_version": row.policy_version,
        "schedule_version": row.schedule_version,
    }


def append_event(
    session: Session, identity: CurrentIdentity, row: Visit, action: str, reason: str = ""
) -> None:
    session.add(
        VisitEvent(
            visit_id=row.id,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            action=action,
            version=row.version,
            snapshot=snapshot(session, row),
            reason=reason,
        )
    )
    record(
        session,
        identity,
        row.contact_id,
        f"visits.{action}",
        body=row.title,
        reason=reason,
        enquiry_id=row.enquiry_id,
        deal_id=row.deal_id,
    )


def view(session: Session, row: Visit) -> dict[str, object]:
    contact = session.get(Contact, row.contact_id)
    if contact is None:
        raise IdentityError("NOT_FOUND", 404)
    ids = participants(session, row.id)
    users = session.scalars(
        select(User).where(User.id.in_(ids)).order_by(User.display_name, User.id)
    ).all()
    return {
        "contact_archived": contact.archived_at is not None,
        "start_local": row.start_at.astimezone(ZONE).isoformat(),
        "end_local": row.end_at.astimezone(ZONE).isoformat(),
        **snapshot(session, row),
        "id": str(row.id),
        "version": row.version,
        "contact_name": contact.name,
        "participants": [{"id": str(u.id), "display_name": u.display_name} for u in users],
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
        "updated_by_user_id": str(row.updated_by_user_id),
    }
