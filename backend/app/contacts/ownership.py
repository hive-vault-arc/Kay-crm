"""Current-scope ownership/lifecycle commands, audit and receipt in one transaction."""

import hmac
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, has_scope, readable_contact, scoped_contact
from app.contacts.eligibility import valid_assignees
from app.contacts.history import assignment, record
from app.contacts.merge import lock_phones, merge_values
from app.contacts.models import Contact, ContactCollaborator, Enquiry, IdempotencyRecord
from app.contacts.ownership_contracts import (
    ChangeIntent,
    ConfirmedChange,
    EnquiryAssignment,
    NewNote,
)
from app.contacts.ownership_preview import collaborators, impact_preview, proposed_scope
from app.contacts.queries import enquiry_in_scope
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity, require_role


def locked_identity(session: Session, token: str) -> CurrentIdentity:
    session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
    identity = current_identity(session, token)
    session.scalars(select(User).where(User.id == identity.user.id).with_for_update()).all()
    session.expire_all()
    return current_identity(session, token)


def locked_contacts(
    session: Session, identity: CurrentIdentity, cid: UUID, intent: ChangeIntent
) -> tuple[Contact, Contact | None]:
    if intent.operation != "merge":
        require_role(identity, {"manager"})
    ids = sorted({cid} | ({intent.survivor_id} if intent.survivor_id else set()))
    session.scalars(
        select(Contact).where(Contact.id.in_(ids)).order_by(Contact.id).with_for_update()
    ).all()
    # Use exact targets, not aliases, for an irreversible merge/ownership intent.
    contact = readable_contact(session, identity, cid)
    if contact.id != cid:
        raise IdentityError("CONTACT_MERGED", 409)
    survivor = (
        readable_contact(session, identity, intent.survivor_id) if intent.survivor_id else None
    )
    if survivor and survivor.id != intent.survivor_id:
        raise IdentityError("CONTACT_MERGED", 409)
    lock_phones(session, ids)
    return contact, survivor


def preview(
    database: Database, token: str, secret: str, cid: UUID, intent: ChangeIntent
) -> dict[str, object]:
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        contact, survivor = locked_contacts(session, identity, cid, intent)
        return impact_preview(session, identity, contact, survivor, intent, secret)


def set_collaborators(
    session: Session, identity: CurrentIdentity, contact: Contact, desired: set[UUID], reason: str
) -> None:
    current = collaborators(session, contact.id)
    for uid in sorted(current ^ desired):
        grant = session.get(ContactCollaborator, (contact.id, uid))
        if uid in desired:
            if grant:
                grant.revoked_at = None
            else:
                session.add(ContactCollaborator(contact_id=contact.id, user_id=uid))
        elif grant:
            grant.revoked_at = datetime.now(UTC)
        assignment(
            session,
            identity,
            contact.id,
            "collaborator_added" if uid in desired else "collaborator_removed",
            None if uid in desired else uid,
            uid if uid in desired else None,
            reason,
        )
    session.flush()


def clear_invalid_assignments(
    session: Session, identity: CurrentIdentity, contact: Contact, reason: str
) -> None:
    enquiries = session.scalars(
        select(Enquiry)
        .where(Enquiry.contact_id == contact.id)
        .order_by(Enquiry.id)
        .with_for_update()
    ).all()
    valid = valid_assignees(
        session, contact, {e.assigned_agent_id for e in enquiries if e.assigned_agent_id}
    )
    for enquiry in enquiries:
        uid = enquiry.assigned_agent_id
        if uid and uid not in valid:
            assignment(session, identity, contact.id, "enquiry", uid, None, reason, enquiry.id)
            enquiry.assigned_agent_id = None
            enquiry.version += 1
            enquiry.updated_at = datetime.now(UTC)


def apply_change(
    session: Session,
    identity: CurrentIdentity,
    contact: Contact,
    survivor: Contact | None,
    body: ConfirmedChange,
) -> tuple[Contact, UUID]:
    owner, grants = proposed_scope(session, identity, contact, survivor, body)
    now = datetime.now(UTC)
    if body.operation == "assign":
        assignment(
            session, identity, contact.id, "primary", contact.primary_agent_id, owner, body.reason
        )
        contact.primary_agent_id = owner
        set_collaborators(session, identity, contact, grants, body.reason)
    elif body.operation == "collaborators":
        set_collaborators(session, identity, contact, grants, body.reason)
    elif body.operation == "archive":
        contact.archived_at = now
    elif body.operation == "restore":
        contact.archived_at = None
    elif survivor:
        contact.archived_at = now
        contact.merged_into_contact_id = survivor.id
        merge_values(session, contact, survivor, identity)
        set_collaborators(session, identity, contact, set(), body.reason)
        record(
            session,
            identity,
            contact.id,
            "contacts.merge",
            body=contact.name,
            reason=body.reason,
            related=survivor.id,
        )
        contact.version += 1
        contact.updated_at = now
    result = survivor or contact
    result.version += 1
    result.updated_at = now
    session.flush()
    clear_invalid_assignments(session, identity, result, body.reason)
    eid = record(
        session,
        identity,
        result.id,
        f"contacts.{body.operation}",
        body=contact.name if survivor else "",
        reason=body.reason,
        related=contact.id if survivor else None,
    )
    return result, eid


def mutate(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    cid: UUID,
    body: ConfirmedChange | NewNote | EnquiryAssignment,
    operation: str,
) -> dict[str, object]:
    route = f"contacts/{cid}/{operation}"
    digest = keyed_digest(
        secret,
        "ownership-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        if operation not in {"notes", "merge"}:
            require_role(identity, {"manager"})
        session.execute(
            delete(IdempotencyRecord).where(
                IdempotencyRecord.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        previous = session.get(IdempotencyRecord, (identity.user.id, route, key))
        if previous:
            if previous.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            readable_contact(session, identity, previous.contact_id)
            return previous.response
        if isinstance(body, ConfirmedChange):
            if operation != body.operation:
                raise IdentityError("VALIDATION_ERROR", 422)
            contact, survivor = locked_contacts(session, identity, cid, body)
            current = impact_preview(session, identity, contact, survivor, body, secret)
            if not hmac.compare_digest(str(current["preview_token"]), body.preview_token):
                raise ContactConflict("IMPACT_CHANGED", {})
            contact, eid = apply_change(session, identity, contact, survivor, body)
        elif isinstance(body, NewNote):
            session.scalars(select(Contact).where(Contact.id == cid).with_for_update()).all()
            contact = scoped_contact(session, identity, cid)
            eid = record(session, identity, contact.id, body.kind, body=body.body)
        else:
            enquiry = enquiry_in_scope(session, identity, cid)
            contact = scoped_contact(session, identity, enquiry.contact_id)
            session.scalars(select(Enquiry).where(Enquiry.id == cid).with_for_update()).all()
            if enquiry.version != body.expected_version:
                raise ContactConflict("OWNERSHIP_VERSION_CONFLICT", {})
            if body.assigned_agent_id and not has_scope(session, body.assigned_agent_id, contact):
                raise IdentityError("INVALID_ASSIGNEE", 422)
            assignment(
                session,
                identity,
                contact.id,
                "enquiry",
                enquiry.assigned_agent_id,
                body.assigned_agent_id,
                body.reason,
                enquiry.id,
            )
            enquiry.assigned_agent_id = body.assigned_agent_id
            enquiry.version += 1
            enquiry.updated_at = datetime.now(UTC)
            eid = record(
                session,
                identity,
                contact.id,
                "enquiries.assign",
                reason=body.reason,
                enquiry_id=enquiry.id,
            )
        session.flush()
        response: dict[str, object] = {
            "contact_id": str(contact.id),
            "version": contact.version,
            "event_id": str(eid),
            "operation": operation,
        }
        session.add(
            IdempotencyRecord(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                contact_id=contact.id,
                response=response,
            )
        )
        return response
