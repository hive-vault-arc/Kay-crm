"""Contact directory predicates and page-bounded counts, under the parent's scope."""

from collections.abc import Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import cast
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.contacts.access import contact_scope
from app.contacts.contracts import ListQuery
from app.contacts.models import Contact, ContactRole, Enquiry
from app.deals.models import Deal
from app.identity.sessions import CurrentIdentity


def dossier_counts(identity: CurrentIdentity) -> tuple[Select[int], Select[int]]:
    # Identical to ContactDossiers' default working lists: nonarchived children,
    # nonconverted enquiries, with the existing agent assignment restriction.
    enquiries = select(func.count()).where(
        Enquiry.contact_id == Contact.id,
        Enquiry.archived_at.is_(None),
        Enquiry.status != "converted",
    )
    if identity.user.role == "agent":
        enquiries = enquiries.where(Enquiry.assigned_agent_id.is_not(None))
    deals = select(func.count()).where(Deal.contact_id == Contact.id, Deal.archived_at.is_(None))
    return enquiries.correlate(Contact), deals.correlate(Contact)


def filter_contacts(
    statement: Select[Contact], identity: CurrentIdentity, query: ListQuery
) -> Select[Contact]:
    if query.primary_agent_id:
        statement = statement.where(Contact.primary_agent_id == query.primary_agent_id)
    if query.role:
        statement = statement.where(
            select(ContactRole.contact_id)
            .where(ContactRole.contact_id == Contact.id, ContactRole.role == query.role)
            .exists()
        )
    if query.linked:
        enquiries, deals = dossier_counts(identity)
        e, d = enquiries.scalar_subquery(), deals.scalar_subquery()
        statement = statement.where(
            e > 0
            if query.linked == "enquiries"
            else d > 0
            if query.linked == "deals"
            else (e == 0) & (d == 0)
        )
    zone = ZoneInfo("Africa/Casablanca")
    if query.created_from:
        statement = statement.where(
            Contact.created_at
            >= datetime.combine(query.created_from, time.min, zone).astimezone(UTC)
        )
    if query.created_to and query.created_to < date.max:
        statement = statement.where(
            Contact.created_at
            < datetime.combine(query.created_to + timedelta(days=1), time.min, zone).astimezone(UTC)
        )
    return statement


def page_dossier_counts(
    session: Session, identity: CurrentIdentity, ids: Sequence[UUID]
) -> dict[UUID, dict[str, int]]:
    if not ids:
        return {}
    enquiries, deals = dossier_counts(identity)
    # Reassert current scope even though ids come from the same scoped snapshot.
    rows = session.execute(
        select(Contact.id, enquiries.scalar_subquery(), deals.scalar_subquery()).where(
            Contact.id.in_(ids), Contact.merged_into_contact_id.is_(None), contact_scope(identity)
        )
    )
    return {
        cast(UUID, cid): {"enquiries": cast(int, e), "deals": cast(int, d)} for cid, e, d in rows
    }
