"""Impact is computed from current authorized records, then bound to confirmation."""

import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, responsible_agent
from app.contacts.eligibility import accounts, eligible
from app.contacts.merge import verify_link_policies
from app.contacts.models import Contact, ContactCollaborator, ContactEmail, ContactPhone, Enquiry
from app.contacts.ownership_contracts import ChangeIntent
from app.contacts.projections import contact_views
from app.deals.contact_links import preview_deals
from app.files.contact_links import preview_documents
from app.identity.models import User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, require_role
from app.inventory.contact_links import preview_links
from app.requirements.contact_links import preview_requirements
from app.schedule.contact_links import preview_visits
from app.work.contact_links import preview_tasks


def collaborators(session: Session, cid: UUID) -> set[UUID]:
    return set(
        session.scalars(
            select(ContactCollaborator.user_id).where(
                ContactCollaborator.contact_id == cid, ContactCollaborator.revoked_at.is_(None)
            )
        )
    )


def proposed_scope(
    session: Session,
    identity: CurrentIdentity,
    contact: Contact,
    survivor: Contact | None,
    intent: ChangeIntent,
) -> tuple[UUID, set[UUID]]:
    if intent.operation != "merge":
        require_role(identity, {"manager"})
    elif survivor is None or survivor.id == contact.id:
        raise IdentityError("VALIDATION_ERROR", 422)
    if contact.merged_into_contact_id is not None:
        raise IdentityError("CONTACT_MERGED", 409)
    if contact.version != intent.expected_version or (
        survivor and survivor.version != intent.survivor_expected_version
    ):
        raise ContactConflict("OWNERSHIP_VERSION_CONFLICT", {})
    if intent.operation == "restore":
        if contact.archived_at is None:
            raise IdentityError("CONTACT_NOT_ARCHIVED", 409)
    elif contact.archived_at is not None or (survivor and survivor.archived_at is not None):
        raise IdentityError("CONTACT_ARCHIVED", 409)
    owner = (survivor or contact).primary_agent_id
    grants = collaborators(session, (survivor or contact).id)
    if intent.operation == "assign":
        owner = responsible_agent(session, identity, intent.primary_agent_id)
        if owner == contact.primary_agent_id:
            raise IdentityError("ASSIGNMENT_UNCHANGED", 422)
        grants.discard(owner)
        grants.discard(contact.primary_agent_id)
        if intent.retain_previous:
            grants.add(contact.primary_agent_id)
    elif intent.operation == "collaborators":
        grants = set(intent.collaborator_ids)
        if owner in grants:
            raise IdentityError("PRIMARY_NOT_COLLABORATOR", 422)
        for uid in grants:
            responsible_agent(session, identity, uid)
    elif intent.operation == "merge":
        verify_link_policies(session)
    return owner, grants


def impact_preview(
    session: Session,
    identity: CurrentIdentity,
    contact: Contact,
    survivor: Contact | None,
    intent: ChangeIntent,
    secret: str,
) -> dict[str, object]:
    owner, grants = proposed_scope(session, identity, contact, survivor, intent)
    ids = [contact.id] + ([survivor.id] if survivor else [])
    enquiries = session.scalars(
        select(Enquiry).where(Enquiry.contact_id.in_(ids)).order_by(Enquiry.id)
    ).all()
    original = collaborators(session, contact.id) | {contact.primary_agent_id}
    after = grants | {owner}
    if intent.operation == "archive":
        after = set()
    account_rows = accounts(
        session,
        original | after | grants | {e.assigned_agent_id for e in enquiries if e.assigned_agent_id},
    )
    if intent.operation == "restore":
        original = set()
    invalid: list[UUID] = []
    for enquiry in enquiries:
        uid = enquiry.assigned_agent_id
        if uid:
            account = account_rows.get(uid)
            if (
                account is None
                or not eligible(*account)
                or (account[0].role == "agent" and uid not in (grants | {owner}))
            ):
                invalid.append(enquiry.id)
    values = list(
        contact_views(session, [contact] + ([survivor] if survivor else []), detail=True).values()
    )
    phones = set(
        session.scalars(
            select(ContactPhone.normalized).where(
                ContactPhone.contact_id.in_(ids), ContactPhone.archived_at.is_(None)
            )
        )
    )
    emails = set(
        session.scalars(
            select(ContactEmail.normalized).where(
                ContactEmail.contact_id.in_(ids), ContactEmail.archived_at.is_(None)
            )
        )
    )
    if len(phones) > 10 or len(emails) > 10:
        raise ContactConflict("MERGE_IDENTITY_LIMIT", {})
    users = [row[0] for row in account_rows.values()]
    owner_user = session.get(User, owner)
    if owner_user is None:
        raise IdentityError("INVALID_ASSIGNEE", 422)

    def agents(uids: set[UUID]) -> list[dict[str, str]]:
        return [{"id": str(u.id), "display_name": u.display_name} for u in users if u.id in uids]

    owner_links, inventory_state = preview_links(session, ids)
    documents = preview_documents(session, ids)
    requirements = preview_requirements(session, ids)
    deals = preview_deals(session, ids)
    visits = preview_visits(session, ids)
    tasks = preview_tasks(session, ids)
    development_owners = sum(
        row.get("kind") == "development_owner" and row.get("active") is True
        for row in inventory_state
    )
    developer_links = sum(row.get("kind") == "developer" for row in inventory_state)
    impact: dict[str, object] = {
        "contacts": values,
        "primary_agent_after": {"id": str(owner), "display_name": owner_user.display_name},
        "enquiries": len(enquiries),
        "unassigned_enquiries": len(invalid),
        "phones_after": len(phones),
        "emails_after": len(emails),
        "access_lost": agents(original - after),
        "access_gained": agents(after - original),
        "retained_collaborators": agents(grants),
        "property_owner_links": owner_links,
        "document_links": len(documents),
        "requirement_links": len(requirements),
        "deal_links": len(deals),
        "visit_links": len(visits),
        "task_links": len(tasks),
        "development_owner_links": development_owners,
        "developer_links": developer_links,
        "linked_modules": ["enquiries"]
        + (["property_owners"] if owner_links else [])
        + (["development_owners"] if development_owners else [])
        + (["developers"] if developer_links else [])
        + (["documents"] if documents else [])
        + (["requirements"] if requirements else [])
        + (["deals"] if deals else [])
        + (["visits"] if visits else [])
        + (["tasks"] if tasks else []),
    }
    # Changes to links, their versions or account eligibility invalidate confirmation too.
    state = {
        "actor_id": str(identity.user.id),
        "intent": intent.model_dump(mode="json", exclude={"preview_token"}),
        "impact": impact,
        "inventory": inventory_state,
        "documents": documents,
        "requirements": requirements,
        "deals": deals,
        "visits": visits,
        "tasks": tasks,
        "enquiries": [(str(e.id), e.version, str(e.assigned_agent_id)) for e in enquiries],
        "users": [(str(u.id), u.version, u.role, u.state) for u in users],
        "credentials": [
            (str(c.user_id), c.must_change_password, str(c.temporary_expires_at))
            for _, c in account_rows.values()
        ],
    }
    digest = keyed_digest(
        secret, "ownership-preview", json.dumps(state, sort_keys=True, separators=(",", ":"))
    ).hex()
    return {"preview_token": digest, "impact": impact}
