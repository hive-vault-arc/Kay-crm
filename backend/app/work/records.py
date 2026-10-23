"""Task scope follows the current contact; owners and authors confer no access."""

from uuid import UUID

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
from app.schedule.rules import ZONE
from app.work.contracts import TaskFields
from app.work.models import Task, TaskEvent


def authorized(
    session: Session, identity: CurrentIdentity, tid: UUID, *, write: bool = False
) -> Task:
    row = session.get(Task, tid)
    if row is None:
        raise IdentityError("NOT_FOUND", 404)
    contact = readable_contact(session, identity, row.contact_id)
    if write and contact.archived_at:
        raise IdentityError("CONTACT_ARCHIVED", 409)
    if write and row.deal_id:
        deal = session.get(Deal, row.deal_id)
        if deal is not None and deal.archived_at is not None:
            raise IdentityError("RECORD_ARCHIVED", 409)
    return row


def check_context(
    session: Session, identity: CurrentIdentity, row: Task, fields: TaskFields, *, new: bool
) -> UUID | None:
    contact = session.get(Contact, row.contact_id)
    if contact is None or contact.archived_at:
        raise IdentityError("CONTACT_ARCHIVED", 409)
    if not has_scope(session, fields.owner_user_id, contact):
        raise IdentityError("INVALID_TASK_OWNER", 422)
    if fields.deal_id:
        deal = session.get(Deal, fields.deal_id)
        if deal is None or deal.contact_id != row.contact_id or deal.archived_at is not None:
            raise IdentityError("INVALID_TASK_CONTEXT", 422)
    if fields.property_id and session.get(Property, fields.property_id) is None:
        raise IdentityError("INVALID_TASK_CONTEXT", 422)
    return enquiry_context(
        session,
        identity,
        row.contact_id,
        fields.enquiry_id or (row.enquiry_id if not new and not fields.deal_id else None),
        fields.deal_id,
        required=new,
        current_enquiry_id=None if new else row.enquiry_id,
    )


def snapshot(row: Task) -> dict[str, object]:
    return {
        "contact_id": str(row.contact_id),
        "origin_contact_id": str(row.origin_contact_id),
        "deal_id": str(row.deal_id) if row.deal_id else None,
        "enquiry_id": str(row.enquiry_id) if row.enquiry_id else None,
        "property_id": str(row.property_id) if row.property_id else None,
        "owner_user_id": str(row.owner_user_id),
        "title": row.title,
        "notes": row.notes,
        "due_at": row.due_at.isoformat(),
        "status": row.status,
        "outcome": row.outcome,
        "schedule_version": row.schedule_version,
    }


def append_event(session: Session, identity: CurrentIdentity, row: Task, action: str) -> None:
    session.add(
        TaskEvent(
            task_id=row.id,
            actor_user_id=identity.user.id,
            actor_name=identity.user.display_name,
            action=action,
            version=row.version,
            snapshot=snapshot(row),
        )
    )
    record(
        session,
        identity,
        row.contact_id,
        f"tasks.{action}",
        body=row.title,
        reason=row.outcome,
        enquiry_id=row.enquiry_id,
        deal_id=row.deal_id,
    )


def view(session: Session, row: Task) -> dict[str, object]:
    contact, owner = session.get(Contact, row.contact_id), session.get(User, row.owner_user_id)
    if contact is None or owner is None:
        raise IdentityError("NOT_FOUND", 404)
    return {
        **snapshot(row),
        "id": str(row.id),
        "version": row.version,
        "contact_name": contact.name,
        "contact_archived": contact.archived_at is not None,
        "owner_name": owner.display_name,
        "owner_eligible": has_scope(session, owner.id, contact),
        "due_local": row.due_at.astimezone(ZONE).isoformat(),
        "created_by_user_id": str(row.created_by_user_id),
        "updated_by_user_id": str(row.updated_by_user_id),
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }
