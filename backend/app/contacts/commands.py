"""Atomic contact/enquiry commands with locked current authority and retry receipts."""

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.contacts.access import (
    ContactConflict,
    check_phones,
    has_scope,
    readable_contact,
    responsible_agent,
    scoped_contact,
)
from app.contacts.contracts import ContactFields, EditContact, EditEnquiry, NewContact, NewEnquiry
from app.contacts.history import record
from app.contacts.models import (
    Contact,
    ContactEmail,
    ContactPhone,
    ContactRole,
    Enquiry,
    IdempotencyRecord,
)
from app.contacts.queries import detail_in_session, enquiry_in_scope
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity

CommandBody = NewContact | NewEnquiry | EditContact | EditEnquiry


def replace_values(session: Session, contact: Contact, body: ContactFields, actor: UUID) -> None:
    for field in ("country", "nationality", "languages"):
        if isinstance(body, NewContact) or field in body.model_fields_set:
            value = getattr(body, field)
            setattr(contact, field, list(value) if field == "languages" else value)
    now = datetime.now(UTC)
    for model in (ContactPhone, ContactEmail):
        session.execute(
            update(model)
            .where(model.contact_id == contact.id, model.archived_at.is_(None))
            .values(archived_at=now)
        )
    session.execute(delete(ContactRole).where(ContactRole.contact_id == contact.id))
    session.flush()
    for phone in body.phones:
        session.add(
            ContactPhone(
                contact_id=contact.id,
                origin_contact_id=contact.id,
                normalized=phone.number,
                label=phone.label,
                is_primary=phone.is_primary,
                created_by_user_id=actor,
            )
        )
    for email in body.emails:
        session.add(
            ContactEmail(
                contact_id=contact.id,
                origin_contact_id=contact.id,
                normalized=email.email,
                label=email.label,
                is_primary=email.is_primary,
                created_by_user_id=actor,
            )
        )
    session.add_all(ContactRole(contact_id=contact.id, role=role) for role in body.roles)


def create_contact(
    session: Session,
    identity: CurrentIdentity,
    body: NewContact,
    source: str,
    submission: UUID | None,
) -> Contact:
    owner = responsible_agent(session, identity, body.primary_agent_id)
    check_phones(session, identity, [phone.number for phone in body.phones])
    contact = Contact(
        name=body.name,
        type=body.type,
        primary_agent_id=owner,
        created_by_user_id=identity.user.id,
        source=source,
        source_submission_id=submission,
    )
    session.add(contact)
    session.flush()
    replace_values(session, contact, body, identity.user.id)
    record(session, identity, contact.id, "contacts.created")
    return contact


def create_enquiry(session: Session, identity: CurrentIdentity, body: NewEnquiry) -> Enquiry:
    if body.source_submission_id and session.scalar(
        select(Enquiry.id).where(
            Enquiry.source == body.source, Enquiry.source_submission_id == body.source_submission_id
        )
    ):
        raise IdentityError("SOURCE_SUBMISSION_CONFLICT", 409)
    contact = (
        create_contact(session, identity, body.new_contact, body.source, body.source_submission_id)
        if body.new_contact
        else scoped_contact(session, identity, body.contact_id)
        if body.contact_id
        else None
    )
    if contact is None:
        raise IdentityError("VALIDATION_ERROR", 422)
    if not contact.languages:
        raise IdentityError("LANGUAGES_REQUIRED", 422)
    if identity.user.role == "agent":
        if body.assigned_agent_id is not None:
            raise IdentityError("FORBIDDEN", 403)
        assignee: UUID | None = identity.user.id
    else:
        assignee = body.assigned_agent_id
    if assignee and not has_scope(session, assignee, contact):
        raise IdentityError("INVALID_ASSIGNEE", 422)
    enquiry = Enquiry(
        contact_id=contact.id,
        origin_contact_id=contact.id,
        message=body.message,
        source=body.source,
        source_submission_id=body.source_submission_id,
        assigned_agent_id=assignee,
        created_by_user_id=identity.user.id,
        initial_budget=body.initial_budget,
        campaign_source=body.campaign_source,
        rating=body.rating,
        status=body.status,
    )
    session.add(enquiry)
    session.flush()
    record(session, identity, contact.id, "enquiries.created", enquiry_id=enquiry.id)
    return enquiry


def apply_command(
    session: Session, identity: CurrentIdentity, kind: str, body: CommandBody, target: UUID | None
) -> tuple[UUID, UUID]:
    if isinstance(body, NewEnquiry):
        enquiry = create_enquiry(session, identity, body)
        return enquiry.id, enquiry.contact_id
    if isinstance(body, NewContact):
        contact = create_contact(session, identity, body, "manual", None)
        return contact.id, contact.id
    if target is None:
        raise IdentityError("VALIDATION_ERROR", 422)
    if isinstance(body, EditContact):
        contact = scoped_contact(session, identity, target)
        if contact.version != body.expected_version:
            raise ContactConflict(
                "VERSION_CONFLICT", {"current": detail_in_session(session, identity, kind, target)}
            )
        check_phones(session, identity, [p.number for p in body.phones], contact.id)
        contact.name, contact.type = body.name, body.type
        contact.version += 1
        contact.updated_at = datetime.now(UTC)
        replace_values(session, contact, body, identity.user.id)
        record(session, identity, contact.id, "contacts.updated")
        return contact.id, contact.id
    enquiry = enquiry_in_scope(session, identity, target)
    if enquiry.archived_at is not None:
        raise IdentityError("RECORD_ARCHIVED", 409)
    scoped_contact(session, identity, enquiry.contact_id)
    if enquiry.version != body.expected_version:
        raise ContactConflict(
            "VERSION_CONFLICT", {"current": detail_in_session(session, identity, kind, target)}
        )
    if enquiry.status == "converted":
        raise IdentityError("LEAD_CONVERTED", 409)
    if body.contact_fields is not None:
        try:
            apply_command(session, identity, "contacts", body.contact_fields, enquiry.contact_id)
        except ContactConflict:
            raise ContactConflict(
                "VERSION_CONFLICT", {"current": detail_in_session(session, identity, kind, target)}
            ) from None
    if not scoped_contact(session, identity, enquiry.contact_id).languages:
        raise IdentityError("LANGUAGES_REQUIRED", 422)
    status_note = (
        f"Statut : {enquiry.status} → {body.status}." if enquiry.status != body.status else ""
    )
    enquiry.message, enquiry.status = body.message, body.status
    enquiry.initial_budget, enquiry.campaign_source, enquiry.rating = (
        body.initial_budget,
        body.campaign_source,
        body.rating,
    )
    enquiry.version += 1
    enquiry.updated_at = datetime.now(UTC)
    record(
        session,
        identity,
        enquiry.contact_id,
        "enquiries.updated",
        enquiry_id=enquiry.id,
        body=status_note,
    )
    return enquiry.id, enquiry.contact_id


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    kind: str,
    body: CommandBody,
    target: UUID | None = None,
) -> dict[str, object]:
    route = f"{kind}/{target}" if target else kind
    digest = keyed_digest(
        secret,
        "contact-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalars(select(User).where(User.id == identity.user.id).with_for_update()).all()
        session.expire_all()
        identity = current_identity(session, token)
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
            if kind == "enquiries":
                enquiry_in_scope(session, identity, UUID(str(previous.response["id"])))
            return previous.response
        if target:
            if kind == "contacts":
                session.scalars(select(Contact).where(Contact.id == target).with_for_update()).all()
            else:
                session.scalars(select(Enquiry).where(Enquiry.id == target).with_for_update()).all()
        resource_id, contact_id = apply_command(session, identity, kind, body, target)
        session.flush()
        response = detail_in_session(session, identity, kind, resource_id)
        session.add(
            IdempotencyRecord(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                contact_id=contact_id,
                response=response,
            )
        )
        return response
