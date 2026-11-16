"""Exact-phone, session-bound read access and dossier handoff notes."""

import hmac
import re
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from pydantic import Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.activities.contracts import MANUAL_KINDS
from app.contacts.access import contact_scope, readable_contact
from app.contacts.contracts import StrictBody, normalize_phone
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, ContactPhone, Enquiry
from app.contacts.ownership import locked_identity
from app.db.session import Database
from app.deals.models import Deal
from app.files.models import Notification
from app.identity.models import AuditEvent, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.work.coverage_models import CoverageNote

Kind = Literal["enquiries", "deals"]
PROOF_PATTERN = r"^[a-f0-9-]{36}\.[a-f0-9-]{36}\.[0-9]{10}\.[a-f0-9]{64}$"
NOTE_KIND = "coverage.note"


class CoverageProof(StrictBody):
    proof: str = Field(pattern=PROOF_PATTERN)


class NewCoverageNote(CoverageProof):
    body: str = Field(min_length=1, max_length=4000, pattern=r"^[^\x00]+$")


def coverage_number(query: str) -> str | None:
    if not re.fullmatch(r"[+0-9 ().-]{7,45}", query):
        return None
    digits = re.sub(r"[^0-9+]", "", query)
    if re.fullmatch(r"0[5-8][0-9]{8}", digits):
        digits = "+212" + digits[1:]
    elif re.fullmatch(r"212[5-8][0-9]{8}", digits):
        digits = "+" + digits
    try:
        return normalize_phone(digits)
    except IdentityError:
        return None


def signature(
    secret: str,
    identity: CurrentIdentity,
    kind: Kind,
    dossier: UUID,
    phone: ContactPhone,
    owner: UUID,
    expires: int,
) -> str:
    binding = (
        f"{identity.session.id}:{kind}:{dossier}:{phone.id}:{phone.normalized}:{owner}:{expires}"
    )
    return keyed_digest(secret, "dossier-coverage", binding).hex()


def coverage_matches(
    session: Session,
    identity: CurrentIdentity,
    query: str,
    secret: str,
) -> list[dict[str, str]]:
    phone_number = coverage_number(query)
    if identity.user.role != "agent" or not phone_number:
        return []
    row = session.execute(
        select(ContactPhone, Contact)
        .join(Contact, Contact.id == ContactPhone.contact_id)
        .where(
            ContactPhone.normalized == phone_number,
            ContactPhone.archived_at.is_(None),
            Contact.archived_at.is_(None),
            Contact.merged_into_contact_id.is_(None),
            ~contact_scope(identity),
        )
    ).one_or_none()
    if row is None:
        return []
    phone, contact = row
    owner = session.get(User, contact.primary_agent_id)
    if owner is None or owner.role != "agent":
        return []
    expires = int((datetime.now(UTC) + timedelta(hours=4)).timestamp())
    matches = []
    kinds: tuple[Kind, ...] = ("enquiries", "deals")
    for kind in kinds:
        if kind == "enquiries":
            records = session.execute(
                select(Enquiry.id)
                .where(
                    Enquiry.contact_id == contact.id,
                    Enquiry.archived_at.is_(None),
                    Enquiry.assigned_agent_id.is_not(None),
                )
                .order_by(Enquiry.updated_at.desc(), Enquiry.id)
                .limit(25)
            )
            targets = [(target, contact.name) for (target,) in records]
        else:
            deal_records = session.execute(
                select(Deal.id, Deal.title)
                .where(Deal.contact_id == contact.id, Deal.archived_at.is_(None))
                .order_by(Deal.updated_at.desc(), Deal.id)
                .limit(25)
            )
            targets = [(target, label) for target, label in deal_records]
        for target, label in targets:
            mac = signature(secret, identity, kind, target, phone, owner.id, expires)
            proof = f"{phone.id}.{owner.id}.{expires}.{mac}"
            matches.append(
                {
                    "kind": kind,
                    "id": str(target),
                    "label": label,
                    "responsible": owner.display_name,
                    "href": f"/handoff/{kind}/{target}#{proof}",
                }
            )
    return matches


def dossier(session: Session, kind: Kind, target: UUID) -> tuple[Enquiry | Deal, Contact]:
    record: Enquiry | Deal | None = (
        session.get(Enquiry, target) if kind == "enquiries" else session.get(Deal, target)
    )
    if record is None or record.archived_at is not None:
        raise IdentityError("NOT_FOUND", 404)
    contact = session.get(Contact, record.contact_id)
    if contact is None or contact.archived_at is not None or contact.merged_into_contact_id:
        raise IdentityError("NOT_FOUND", 404)
    return record, contact


def verify(
    session: Session,
    identity: CurrentIdentity,
    kind: Kind,
    target: UUID,
    secret: str,
    proof: str,
) -> tuple[Enquiry | Deal, Contact]:
    if identity.user.role != "agent":
        raise IdentityError("NOT_FOUND", 404)
    pid, owner, expiry, mac = proof.split(".")
    try:
        phone_id, owner_id, expires = UUID(pid), UUID(owner), int(expiry)
    except ValueError:
        raise IdentityError("NOT_FOUND", 404) from None
    if datetime.now(UTC).timestamp() >= expires:
        raise IdentityError("NOT_FOUND", 404)
    phone = session.get(ContactPhone, phone_id)
    if (
        phone is None
        or phone.archived_at is not None
        or not hmac.compare_digest(
            mac, signature(secret, identity, kind, target, phone, owner_id, expires)
        )
    ):
        raise IdentityError("NOT_FOUND", 404)
    record, contact = dossier(session, kind, target)
    if (
        contact.id != phone.contact_id
        or contact.primary_agent_id != owner_id
        or isinstance(record, Enquiry)
        and record.assigned_agent_id is None
        or session.scalar(
            select(Contact.id).where(Contact.id == contact.id, contact_scope(identity))
        )
    ):
        raise IdentityError("NOT_FOUND", 404)
    owner_user = session.get(User, owner_id)
    if owner_user is None or owner_user.role != "agent":
        raise IdentityError("NOT_FOUND", 404)
    return record, contact


def notes(session: Session, kind: Kind, target: UUID, *, viewer: UUID) -> list[dict[str, object]]:
    parent = CoverageNote.enquiry_id if kind == "enquiries" else CoverageNote.deal_id
    return [
        {
            "id": str(note.id),
            "body": note.body,
            "author_name": note.author_name,
            "created_at": note.created_at.isoformat(),
            "seen_at": note.seen_at.isoformat() if note.seen_at else None,
        }
        for note in session.scalars(
            select(CoverageNote)
            .where(parent == target)
            .order_by(
                (CoverageNote.seen_at.is_(None) & (CoverageNote.author_user_id != viewer)).desc(),
                CoverageNote.created_at.desc(),
                CoverageNote.id,
            )
            .limit(50)
        )
    ]


def scoped_dossier(
    session: Session,
    identity: CurrentIdentity,
    kind: Kind,
    target: UUID,
) -> tuple[Enquiry | Deal, Contact]:
    record, contact = dossier(session, kind, target)
    readable_contact(session, identity, contact.id)
    if (
        isinstance(record, Enquiry)
        and identity.user.role == "agent"
        and record.assigned_agent_id is None
    ):
        raise IdentityError("NOT_FOUND", 404)
    return record, contact


def read_notes(database: Database, token: str, kind: Kind, target: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        _, contact = scoped_dossier(session, identity, kind, target)
        return {
            "can_mark_seen": contact.primary_agent_id == identity.user.id,
            "items": notes(session, kind, target, viewer=identity.user.id),
        }


def read_coverage(
    database: Database,
    token: str,
    secret: str,
    kind: Kind,
    target: UUID,
    body: CoverageProof,
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        record, contact = verify(session, identity, kind, target, secret, body.proof)
        owner = session.get(User, contact.primary_agent_id)
        activity_parent = TimelineEvent.enquiry_id if kind == "enquiries" else TimelineEvent.deal_id
        activities = session.scalars(
            select(TimelineEvent)
            .where(activity_parent == target, TimelineEvent.action.in_(MANUAL_KINDS))
            .order_by(TimelineEvent.occurred_at.desc(), TimelineEvent.id)
            .limit(10)
        )
        return {
            "id": str(record.id),
            "kind": kind,
            "contact": contact.name,
            "responsible": owner.display_name if owner else "",
            "title": contact.name if isinstance(record, Enquiry) else record.title,
            "status": record.status if isinstance(record, Enquiry) else record.stage,
            "rating": record.rating,
            "budget": record.initial_budget,
            "context": record.message if isinstance(record, Enquiry) else record.next_action,
            "detail": "" if isinstance(record, Enquiry) else record.notes,
            "updated_at": record.updated_at.isoformat(),
            "activities": [
                {
                    "id": str(event.id),
                    "body": event.body,
                    "author_name": event.actor_name,
                    "created_at": event.occurred_at.isoformat(),
                }
                for event in activities
            ],
            "items": notes(session, kind, target, viewer=identity.user.id),
        }


def write_note(
    database: Database,
    token: str,
    secret: str,
    kind: Kind,
    target: UUID,
    body: NewCoverageNote,
    key: UUID,
) -> dict[str, str]:
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        _, contact = verify(session, identity, kind, target, secret, body.proof)
        existing = session.scalar(
            select(CoverageNote).where(
                CoverageNote.author_user_id == identity.user.id, CoverageNote.request_key == key
            )
        )
        parents = {
            "enquiry_id": target if kind == "enquiries" else None,
            "deal_id": target if kind == "deals" else None,
        }
        if existing is not None:
            if (existing.enquiry_id, existing.deal_id, existing.body) != (
                parents["enquiry_id"],
                parents["deal_id"],
                body.body,
            ):
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return {"id": str(existing.id)}
        note = CoverageNote(
            **parents,
            author_user_id=identity.user.id,
            author_name=identity.user.display_name,
            body=body.body,
            request_key=key,
        )
        session.add(note)
        session.add(
            AuditEvent(
                **parents,
                contact_id=contact.id,
                actor_user_id=identity.user.id,
                action=f"{kind}.coverage_note.created",
            )
        )
        session.flush()
        return {"id": str(note.id)}


def acknowledge(session: Session, note: CoverageNote, contact: Contact, user_id: UUID) -> None:
    if contact.primary_agent_id != user_id:
        raise IdentityError("NOT_FOUND", 404)
    now = note.seen_at or datetime.now(UTC)
    if note.seen_at is None:
        note.seen_at, note.seen_by_user_id = now, user_id
        kind = "enquiries" if note.enquiry_id else "deals"
        session.add(
            AuditEvent(
                enquiry_id=note.enquiry_id,
                deal_id=note.deal_id,
                contact_id=contact.id,
                actor_user_id=user_id,
                action=f"{kind}.coverage_note.seen",
            )
        )
    latest = session.scalar(
        select(Notification)
        .where(Notification.coverage_note_id == note.id, Notification.user_id == user_id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(1)
    )
    if latest is not None and latest.read_at is None:
        latest.read_at = now


def acknowledge_note(
    database: Database,
    token: str,
    kind: Kind,
    target: UUID,
    note_id: UUID,
) -> dict[str, bool]:
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        _, contact = scoped_dossier(session, identity, kind, target)
        note = session.get(CoverageNote, note_id)
        if note is None or (note.enquiry_id if kind == "enquiries" else note.deal_id) != target:
            raise IdentityError("NOT_FOUND", 404)
        acknowledge(session, note, contact, identity.user.id)
        return {"read": True}
