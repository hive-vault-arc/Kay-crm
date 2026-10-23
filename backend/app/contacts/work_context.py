"""Bind new work to one explicit enquiry or deal, never to an arbitrary contact lead."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.models import Enquiry
from app.contacts.queries import enquiry_in_scope
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity


def enquiry_context(
    session: Session,
    identity: CurrentIdentity,
    contact_id: UUID,
    enquiry_id: UUID | None,
    deal_id: UUID | None,
    *,
    required: bool,
    current_enquiry_id: UUID | None = None,
) -> UUID | None:
    if deal_id:
        if enquiry_id:
            raise IdentityError("INVALID_WORK_CONTEXT", 422)
        return None
    if enquiry_id:
        if enquiry_id == current_enquiry_id:
            # Contact transfer or Lead archive must not orphan an existing visit/task.
            existing = session.get(Enquiry, enquiry_id)
            if existing is None or existing.contact_id != contact_id:
                raise IdentityError("INVALID_WORK_CONTEXT", 422)
            return existing.id
        enquiry = enquiry_in_scope(session, identity, enquiry_id)
        if enquiry.contact_id != contact_id or enquiry.archived_at is not None:
            raise IdentityError("INVALID_WORK_CONTEXT", 422)
        return enquiry.id
    if not required:
        return None
    candidates = session.scalars(
        select(Enquiry.id)
        .where(Enquiry.contact_id == contact_id, Enquiry.archived_at.is_(None))
        .limit(2)
    ).all()
    if len(candidates) != 1:
        raise IdentityError("ENQUIRY_CONTEXT_REQUIRED", 422)
    return enquiry_in_scope(session, identity, candidates[0]).id
