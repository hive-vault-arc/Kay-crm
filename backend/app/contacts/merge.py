"""One merge path; future contact-linked modules must declare their link policy."""

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict
from app.contacts.models import Contact, ContactEmail, ContactPhone, ContactRole, Enquiry
from app.deals.contact_links import merge_deals
from app.files.contact_links import merge_documents
from app.identity.sessions import CurrentIdentity
from app.inventory.contact_links import merge_links
from app.requirements.contact_links import merge_requirements
from app.schedule.contact_links import merge_visits
from app.work.contact_links import merge_tasks

# Explicit policies distinguish current links from immutable origin/history FKs.
CONTACT_LINK_POLICIES = {
    "import_row": "immutable_origin_contact_at_import",
    "task": "reparent_current_preserve_owner_origin_and_actor_history",
    "visit": "reparent_current_preserve_origin_and_actor_history",
    "deal": "reparent_current_preserve_independent_origin_targets_and_history",
    "deal_stage_event": "historical_current_deal_scope",
    "requirement": "reparent_current_preserve_independence_origin_and_actor",
    "document": "reparent_current_preserve_origin_and_actor",
    "development_owner": "reparent_current_preserve_origin",
    "development": "reparent_developer_preserve_history",
    "property_owner": "reparent_current_preserve_origin",
    "contact": "alias",
    "contact_phone": "preserve_and_copy",
    "contact_email": "preserve_and_copy",
    "contact_role": "union",
    "contact_collaborator": "survivor_only",
    "enquiry": "reparent",
    "audit_event": "historical",
    "timeline_event": "historical",
    "assignment_event": "historical",
    "idempotency_record": "current_authority_on_replay",
}


def verify_link_policies(session: Session) -> None:
    tables = set(
        session.scalars(
            text("""SELECT DISTINCT source.relname FROM pg_constraint fk
      JOIN pg_class source ON source.oid=fk.conrelid
      WHERE fk.contype='f' AND fk.confrelid='contact'::regclass""")
        )
    )
    if tables - CONTACT_LINK_POLICIES.keys():
        raise ContactConflict("MERGE_LINKS_UNSUPPORTED", {})


def merge_values(
    session: Session, source: Contact, survivor: Contact, identity: CurrentIdentity
) -> None:
    for field in ("country", "nationality"):
        if not getattr(survivor, field):
            setattr(survivor, field, getattr(source, field))
    survivor.languages = list(dict.fromkeys([*survivor.languages, *source.languages]))
    if len(survivor.languages) > 30:
        raise ContactConflict("MERGE_IDENTITY_LIMIT", {})
    merge_links(session, identity, source.id, survivor.id)
    merge_documents(session, source.id, survivor.id)
    merge_requirements(session, source.id, survivor.id)
    merge_deals(session, identity, source.id, survivor.id)
    merge_visits(session, identity, source.id, survivor.id)
    merge_tasks(session, identity, source.id, survivor.id)
    now = datetime.now(UTC)
    # Values are copied, originals retained. Global phone uniqueness remains authoritative.
    for model in (ContactPhone, ContactEmail):
        incoming = cast(
            Sequence[ContactPhone | ContactEmail],
            session.scalars(
                select(model)
                .where(model.contact_id == source.id, model.archived_at.is_(None))
                .order_by(model.normalized)
                .with_for_update()
            ).all(),
        )
        existing = cast(
            Sequence[ContactPhone | ContactEmail],
            session.scalars(
                select(model)
                .where(model.contact_id == survivor.id, model.archived_at.is_(None))
                .order_by(model.normalized)
                .with_for_update()
            ).all(),
        )
        normalized = {v.normalized for v in existing}
        additions = [v for v in incoming if v.normalized not in normalized]
        if len(existing) + len(additions) > 10:
            raise ContactConflict("MERGE_IDENTITY_LIMIT", {})
        for value in incoming:
            value.archived_at = now
        session.flush()
        for value in additions:
            session.add(
                model(
                    contact_id=survivor.id,
                    origin_contact_id=value.origin_contact_id,
                    normalized=value.normalized,
                    label=value.label,
                    is_primary=not existing and value.is_primary,
                    created_by_user_id=value.created_by_user_id,
                    website_source_id=value.website_source_id,
                    created_at=value.created_at,
                )
            )
    roles = set(
        session.scalars(select(ContactRole.role).where(ContactRole.contact_id == survivor.id))
    )
    for role in session.scalars(
        select(ContactRole.role).where(ContactRole.contact_id == source.id)
    ):
        if role not in roles:
            session.add(ContactRole(contact_id=survivor.id, role=role))
    for enquiry in session.scalars(
        select(Enquiry)
        .where(Enquiry.contact_id == source.id)
        .order_by(Enquiry.id)
        .with_for_update()
    ):
        enquiry.contact_id = survivor.id
        enquiry.version += 1
        enquiry.updated_at = now


def lock_phones(session: Session, ids: list[UUID]) -> None:
    session.scalars(
        select(ContactPhone)
        .where(ContactPhone.contact_id.in_(ids), ContactPhone.archived_at.is_(None))
        .order_by(ContactPhone.normalized)
        .with_for_update()
    ).all()
