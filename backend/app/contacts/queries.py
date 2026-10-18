"""Scope precedes query filters, count and stable numbered pagination."""

from datetime import UTC, datetime, time, timedelta
from typing import get_args
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.contacts.access import check_phones, contact_scope, readable_contact
from app.contacts.contracts import EnquiryStatus, ListQuery
from app.contacts.models import Contact, ContactEmail, ContactPhone, Enquiry
from app.contacts.projections import contact_views, enquiry_views
from app.contacts.qualification import qualification_catalogue
from app.db.session import Database
from app.identity.models import Credential, User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity, require_role


def enquiry_in_scope(session: Session, identity: CurrentIdentity, eid: UUID) -> Enquiry:
    query = (
        select(Enquiry)
        .join(Contact, Contact.id == Enquiry.contact_id)
        .where(Enquiry.id == eid, contact_scope(identity))
    )
    if identity.user.role == "agent":
        query = query.where(Enquiry.assigned_agent_id.is_not(None), Contact.archived_at.is_(None))
    enquiry = session.scalar(query)
    if enquiry is None:
        raise IdentityError("NOT_FOUND", 404)
    return enquiry


def detail_in_session(
    session: Session, identity: CurrentIdentity, kind: str, target: UUID
) -> dict[str, object]:
    if kind == "contacts":
        contact = readable_contact(session, identity, target)
        return contact_views(session, [contact], detail=True)[contact.id]
    enquiry = enquiry_in_scope(session, identity, target)
    contact = readable_contact(session, identity, enquiry.contact_id)
    return enquiry_views(session, [enquiry], [contact], detail=True)[0]


def read_detail(database: Database, token: str, kind: str, target: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        return detail_in_session(session, current_identity(session, token), kind, target)


def metadata(database: Database, token: str) -> dict[str, object]:
    with database.session() as session:
        current_identity(session, token)
        return qualification_catalogue()


def read_list(database: Database, token: str, kind: str, query: ListQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        return list_in_session(session, current_identity(session, token), kind, query)


def list_in_session(
    session: Session, identity: CurrentIdentity, kind: str, query: ListQuery
) -> dict[str, object]:
    if query.archive != "active" and identity.user.role == "agent":
        raise IdentityError("FORBIDDEN", 403)
    contacts = select(Contact).where(
        Contact.merged_into_contact_id.is_(None), contact_scope(identity)
    )
    if query.archive == "active":
        contacts = contacts.where(Contact.archived_at.is_(None))
    elif query.archive == "archived":
        contacts = contacts.where(Contact.archived_at.is_not(None))
    if query.q:
        # User wildcard characters are literal, never a way around scope.
        needle = "%" + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        phone_needle = "".join(c for c in query.q if c.isdecimal())
        phone_match = (
            select(ContactPhone.id)
            .where(
                ContactPhone.contact_id == Contact.id,
                ContactPhone.archived_at.is_(None),
                ContactPhone.normalized.contains(phone_needle, autoescape=True),
            )
            .exists()
            if len(phone_needle) >= 3
            else text("false")
        )
        contacts = contacts.where(
            or_(
                Contact.name.ilike(needle, escape="\\"),
                phone_match,
                select(ContactEmail.id)
                .where(
                    ContactEmail.contact_id == Contact.id,
                    ContactEmail.archived_at.is_(None),
                    ContactEmail.normalized.ilike(needle, escape="\\"),
                )
                .exists(),
            )
        )
    if query.contact_id:
        contacts = contacts.where(Contact.id == query.contact_id)
    if query.country:
        contacts = contacts.where(Contact.country == query.country)
    if query.language:
        contacts = contacts.where(Contact.languages.contains([query.language]))
    if kind == "contacts":
        if (
            query.status
            or query.campaign_source
            or query.rating
            or query.source
            or query.assigned_agent_id
            or query.received_from
            or query.received_to
            or query.sort == "-received_at"
        ):
            raise IdentityError("VALIDATION_ERROR", 422)
        count = session.scalar(select(func.count()).select_from(contacts.subquery())) or 0
        ordering = (
            (Contact.name.asc(), Contact.id)
            if query.sort == "name"
            else (Contact.updated_at.desc(), Contact.id)
        )
        records = session.scalars(
            contacts.order_by(*ordering)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        items = list(contact_views(session, records).values())
    else:
        enquiries = (
            select(Enquiry)
            .join(Contact, Contact.id == Enquiry.contact_id)
            .where(Contact.id.in_(contacts.with_only_columns(Contact.id)))
        )
        if identity.user.role == "agent":
            enquiries = enquiries.where(Enquiry.assigned_agent_id.is_not(None))
        if query.status:
            enquiries = enquiries.where(Enquiry.status == query.status)
        else:
            enquiries = enquiries.where(Enquiry.status != "converted")
        if query.campaign_source:
            enquiries = enquiries.where(Enquiry.campaign_source == query.campaign_source)
        if query.rating:
            enquiries = enquiries.where(Enquiry.rating == query.rating)
        if query.source:
            enquiries = enquiries.where(Enquiry.source == query.source)
        if query.assigned_agent_id:
            enquiries = enquiries.where(Enquiry.assigned_agent_id == query.assigned_agent_id)
        for value, end in ((query.received_from, False), (query.received_to, True)):
            if value:
                bound = datetime.combine(
                    value + timedelta(days=1) if end else value,
                    time.min,
                    ZoneInfo("Africa/Casablanca"),
                ).astimezone(UTC)
                enquiries = enquiries.where(
                    Enquiry.received_at < bound if end else Enquiry.received_at >= bound
                )
        filtered = enquiries.subquery()
        counts: dict[str, int] = dict(
            session.execute(
                select(filtered.c.status, func.count()).group_by(filtered.c.status)
            ).all()
        )
        count = sum(counts.values())
        ordering = (
            (Contact.name.asc(), Enquiry.id)
            if query.sort == "name"
            else (
                (
                    Enquiry.received_at.desc()
                    if query.sort == "-received_at"
                    else Enquiry.updated_at.desc()
                ),
                Enquiry.id,
            )
        )
        rows = session.scalars(
            enquiries.order_by(*ordering)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        records = session.scalars(
            select(Contact).where(Contact.id.in_({e.contact_id for e in rows}))
        ).all()
        items = enquiry_views(session, rows, records)
    return {
        "items": items,
        "page": query.page,
        "page_size": query.page_size,
        "total": count,
        "has_next": query.page * query.page_size < count,
        "has_previous": query.page > 1,
        **(
            {
                "status_counts": {
                    status: counts.get(status, 0)
                    for status in (*get_args(EnquiryStatus), "converted")
                }
            }
            if kind == "enquiries"
            else {}
        ),
    }


def resolve_phone(database: Database, token: str, phone: str) -> dict[str, bool]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        check_phones(session, current_identity(session, token), [phone])
        return {"available": True}


def assignment_options(database: Database, token: str, query: ListQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        require_role(current_identity(session, token), {"manager"})
        users = (
            select(User)
            .join(Credential)
            .where(
                User.role == "agent",
                User.state == "active",
                Credential.must_change_password.is_(False),
                Credential.temporary_expires_at.is_(None),
            )
        )
        if query.q:
            users = users.where(User.display_name.contains(query.q, autoescape=True))
        total = session.scalar(select(func.count()).select_from(users.subquery())) or 0
        rows = session.scalars(
            users.order_by(User.display_name, User.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return {
            "items": [{"id": str(user.id), "display_name": user.display_name} for user in rows],
            "page": query.page,
            "page_size": query.page_size,
            "total": total,
            "has_next": query.page * query.page_size < total,
            "has_previous": query.page > 1,
        }
