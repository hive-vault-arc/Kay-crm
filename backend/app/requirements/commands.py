"""Agency-first versioned commands; receipts never cache private record bodies."""

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, readable_contact
from app.contacts.history import record
from app.db.session import Database
from app.deals.requirement_links import check_requirement_intent
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.models import Offering
from app.requirements.contracts import (
    EditRequirement,
    NewRequirement,
    RemoveShortlist,
    RequirementFields,
    ShortlistChange,
)
from app.requirements.models import (
    Requirement,
    RequirementCriterion,
    RequirementReceipt,
    ShortlistEntry,
)
from app.requirements.queries import authorized

Body = NewRequirement | EditRequirement | ShortlistChange | RemoveShortlist


def fields(session: Session, row: Requirement, body: RequirementFields) -> None:
    for name in (
        "title",
        "intent",
        "currency",
        "budget_min_mad",
        "budget_max_mad",
        "budget_period",
    ):
        setattr(row, name, getattr(body, name))
    session.execute(
        delete(RequirementCriterion).where(RequirementCriterion.requirement_id == row.id)
    )
    for c in body.criteria:
        session.add(
            RequirementCriterion(
                requirement_id=row.id,
                key=c.key,
                importance=c.importance,
                value_bool=c.value if type(c.value) is bool else None,
                value_number=c.value if c.key in {"area_sqm", "rooms"} else None,
                value_text=c.value if c.key in {"category", "location"} else None,
            )
        )


def apply(
    session: Session, identity: CurrentIdentity, body: Body, rid: UUID | None, oid: UUID | None
) -> Requirement:
    if isinstance(body, NewRequirement):
        contact = readable_contact(session, identity, body.contact_id)
        if contact.archived_at is not None:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        row = Requirement(
            id=uuid4(),
            contact_id=contact.id,
            origin_contact_id=contact.id,
            title=body.title,
            intent=body.intent,
            budget_period=body.budget_period,
            created_by_user_id=identity.user.id,
            updated_by_user_id=identity.user.id,
        )
        session.add(row)
        session.flush()
        fields(session, row, body)
        action = "requirements.created"
    else:
        if rid is None:
            raise IdentityError("NOT_FOUND", 404)
        row = authorized(session, identity, rid)
        contact = readable_contact(session, identity, row.contact_id)
        if contact.archived_at is not None:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        if row.version != body.expected_version:
            raise ContactConflict(
                "REQUIREMENT_VERSION_CONFLICT", {"current": {"version": row.version}}
            )
        if isinstance(body, EditRequirement):
            if row.intent != body.intent:
                if session.scalar(
                    select(ShortlistEntry.requirement_id)
                    .where(ShortlistEntry.requirement_id == rid)
                    .limit(1)
                ):
                    raise IdentityError("REQUIREMENT_INTENT_IN_USE", 409)
                check_requirement_intent(session, rid, body.intent)
            fields(session, row, body)
            action = "requirements.updated"
        elif isinstance(body, ShortlistChange):
            offering = session.get(Offering, body.offering_id)
            if offering is None:
                raise IdentityError("NOT_FOUND", 404)
            if offering.kind != row.intent:
                raise IdentityError("OFFERING_INTENT_MISMATCH", 422)
            if offering.version != body.expected_offering_version:
                raise IdentityError("OFFERING_VERSION_CONFLICT", 409)
            entry = session.get(ShortlistEntry, (rid, offering.id))
            if entry is None:
                count = (
                    session.scalar(
                        select(func.count())
                        .select_from(ShortlistEntry)
                        .where(ShortlistEntry.requirement_id == rid)
                    )
                    or 0
                )
                if count >= 100:
                    raise IdentityError("SHORTLIST_LIMIT", 422)
                entry = ShortlistEntry(
                    requirement_id=rid,
                    offering_id=offering.id,
                    created_by_user_id=identity.user.id,
                    updated_by_user_id=identity.user.id,
                )
                session.add(entry)
            entry.feedback, entry.updated_by_user_id, entry.updated_at = (
                body.feedback,
                identity.user.id,
                datetime.now(UTC),
            )
            action = "requirements.shortlisted"
        else:
            entry = session.get(ShortlistEntry, (rid, oid))
            if entry is None:
                raise IdentityError("NOT_FOUND", 404)
            session.delete(entry)
            action = "requirements.unshortlisted"
        row.version += 1
    row.updated_by_user_id, row.updated_at = identity.user.id, datetime.now(UTC)
    record(session, identity, row.contact_id, action)
    session.flush()
    return row


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    body: Body,
    rid: UUID | None = None,
    oid: UUID | None = None,
) -> dict[str, object]:
    route = f"{type(body).__name__}/{rid or ''}/{oid or ''}"
    digest = keyed_digest(
        secret,
        "requirement-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        session.execute(
            delete(RequirementReceipt).where(
                RequirementReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        receipt = session.get(RequirementReceipt, (identity.user.id, route, key))
        if receipt:
            row = authorized(session, identity, receipt.requirement_id)
            if readable_contact(session, identity, row.contact_id).archived_at is not None:
                raise IdentityError("CONTACT_ARCHIVED", 409)
            if receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return {"id": str(row.id), "version": receipt.result_version}
        row = apply(session, identity, body, rid, oid)
        session.add(
            RequirementReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                requirement_id=row.id,
                result_version=row.version,
            )
        )
        return {"id": str(row.id), "version": row.version}
