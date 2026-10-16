"""Current contact scope and deliberately limited conflict disclosures."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import ColumnElement, select, true, union_all
from sqlalchemy.orm import Session

from app.contacts.models import Contact, ContactCollaborator, ContactPhone
from app.identity.models import Credential, User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, credential_active


class ContactConflict(IdentityError):
    def __init__(self, code: str, details: dict[str, object]) -> None:
        super().__init__(code, 409)
        self.details = details


def contact_scope(identity: CurrentIdentity) -> ColumnElement[bool]:
    if identity.user.role != "agent":
        return true()
    # Set membership preserves scope without a per-contact correlated grant probe.
    return Contact.id.in_(
        union_all(
            select(Contact.id).where(Contact.primary_agent_id == identity.user.id).correlate(None),
            select(ContactCollaborator.contact_id)
            .where(
                ContactCollaborator.user_id == identity.user.id,
                ContactCollaborator.revoked_at.is_(None),
            )
            .correlate(None),
        )
    )


def scoped_contact(session: Session, identity: CurrentIdentity, cid: UUID) -> Contact:
    contact = session.scalar(
        select(Contact).where(
            Contact.id == cid, Contact.archived_at.is_(None), contact_scope(identity)
        )
    )
    if contact is None:
        raise IdentityError("NOT_FOUND", 404)
    return contact


def readable_contact(session: Session, identity: CurrentIdentity, cid: UUID) -> Contact:
    # Aliases grant no authority: check only the final survivor's current scope.
    visited: set[UUID] = set()
    while cid not in visited:
        visited.add(cid)
        row = session.get(Contact, cid)
        if row is None:
            break
        if row.merged_into_contact_id:
            cid = row.merged_into_contact_id
            continue
        contact = session.scalar(select(Contact).where(Contact.id == cid, contact_scope(identity)))
        if contact is not None and (contact.archived_at is None or identity.user.role != "agent"):
            return contact
        break
    raise IdentityError("NOT_FOUND", 404)


def has_scope(session: Session, uid: UUID, contact: Contact) -> bool:
    user = session.get(User, uid)
    credential = session.get(Credential, uid)
    if (
        user is None
        or credential is None
        or not credential_active(user, credential, datetime.now(UTC))
        or credential.must_change_password
    ):
        return False
    return (
        user.role != "agent"
        or contact.primary_agent_id == uid
        or session.scalar(
            select(ContactCollaborator.contact_id).where(
                ContactCollaborator.contact_id == contact.id,
                ContactCollaborator.user_id == uid,
                ContactCollaborator.revoked_at.is_(None),
            )
        )
        is not None
    )


def responsible_agent(session: Session, identity: CurrentIdentity, selected: UUID | None) -> UUID:
    if identity.user.role == "agent":
        if selected is not None:
            raise IdentityError("FORBIDDEN", 403)
        return identity.user.id
    row = session.execute(
        select(User, Credential).join(Credential).where(User.id == selected, User.role == "agent")
    ).one_or_none()
    if (
        row is None
        or not credential_active(row[0], row[1], datetime.now(UTC))
        or row[1].must_change_password
    ):
        raise IdentityError("INVALID_ASSIGNEE", 422)
    return row[0].id


def check_phones(
    session: Session, identity: CurrentIdentity, numbers: list[str], excluding: UUID | None = None
) -> None:
    matches = session.scalars(
        select(Contact)
        .join(ContactPhone, ContactPhone.contact_id == Contact.id)
        .where(
            ContactPhone.normalized.in_(numbers),
            ContactPhone.archived_at.is_(None),
            Contact.id != excluding if excluding else true(),
        )
        .distinct()
        .order_by(Contact.id)
    ).all()
    accessible = set(
        session.scalars(
            select(Contact.id).where(
                Contact.id.in_([c.id for c in matches]),
                Contact.archived_at.is_(None),
                contact_scope(identity),
            )
        )
    )
    for contact in matches:
        if contact.id not in accessible:
            name = session.scalar(
                select(User.display_name).where(User.id == contact.primary_agent_id)
            )
            raise ContactConflict(
                "PHONE_OWNED_ELSEWHERE", {"responsible_agent": {"display_name": name}}
            )
    if matches:
        raise ContactConflict(
            "DUPLICATE_CONFIRMATION_REQUIRED",
            {"contacts": [{"id": str(contact.id), "name": contact.name} for contact in matches]},
        )
