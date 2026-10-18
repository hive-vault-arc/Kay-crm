"""Current contact scope precedes text filters, stage summaries and numbered pages."""

from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select, text

from app.contacts.access import contact_scope, readable_contact
from app.contacts.models import Contact
from app.db.session import Database
from app.deals.access import authorized
from app.deals.contracts import STAGES, ChildQuery, DealQuery
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal
from app.deals.project_models import DealProject
from app.deals.projections import customer_offer_view, deal_views, event_views
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.inventory.models import Offering


def page_result(
    items: list[dict[str, object]], total: int, query: DealQuery | ChildQuery
) -> dict[str, object]:
    return {
        "items": items,
        "total": total,
        "page": query.page,
        "page_size": query.page_size,
        "has_previous": query.page > 1,
        "has_next": query.page * query.page_size < total,
    }


def read_detail(database: Database, token: str, did: UUID) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        row = authorized(session, current_identity(session, token), did)
        return deal_views(session, [row])[0]


def read_list(database: Database, token: str, query: DealQuery) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        if identity.user.role == "agent" and query.archive != "active":
            raise IdentityError("FORBIDDEN", 403)
        base = (
            select(Deal)
            .join(Contact, Contact.id == Deal.contact_id)
            .outerjoin(Offering, Offering.id == Deal.offering_id)
        )
        base = base.where(contact_scope(identity), Contact.merged_into_contact_id.is_(None))
        if query.archive != "all":
            base = base.where(
                Contact.archived_at.is_(None)
                if query.archive == "active"
                else Contact.archived_at.is_not(None)
            )
        if query.contact_id:
            contact = readable_contact(session, identity, query.contact_id)
            base = base.where(Deal.contact_id == contact.id)
        if query.q:
            needle = (
                "%" + query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            )
            base = base.where(
                or_(
                    Deal.title.ilike(needle, escape="\\"),
                    Contact.name.ilike(needle, escape="\\"),
                    Deal.next_action.ilike(needle, escape="\\"),
                    Deal.id.in_(
                        select(DealProject.deal_id).where(
                            DealProject.name.ilike(needle, escape="\\")
                        )
                    ),
                )
            )
        for value, column in (
            (query.stage, Deal.stage),
            (query.assigned_agent_id, Contact.primary_agent_id),
            (query.offering_kind, Offering.kind),
            (query.campaign_source, Deal.campaign_source),
            (query.rating, Deal.rating),
            (query.country, Contact.country),
        ):
            if value is not None:
                base = base.where(column == value)
        if query.language is not None:
            base = base.where(Contact.languages.contains([query.language]))
        if query.development_id is not None or query.property_id is not None:
            projects = select(DealProject.deal_id)
            if query.development_id is not None:
                projects = projects.where(DealProject.development_id == query.development_id)
            if query.property_id is not None:
                projects = projects.where(DealProject.property_id == query.property_id)
            base = base.where(Deal.id.in_(projects))
        zone = ZoneInfo("Africa/Casablanca")
        if query.updated_from:
            base = base.where(
                Deal.updated_at
                >= datetime.combine(query.updated_from, time.min, zone).astimezone(UTC)
            )
        if query.updated_to and query.updated_to < date.max:
            base = base.where(
                Deal.updated_at
                < datetime.combine(query.updated_to + timedelta(days=1), time.min, zone).astimezone(
                    UTC
                )
            )
        filtered = base.subquery()
        total = session.scalar(select(func.count()).select_from(filtered)) or 0
        counts: dict[str, int] = dict(
            session.execute(select(filtered.c.stage, func.count()).group_by(filtered.c.stage)).all()
        )
        order = {
            "-updated_at": Deal.updated_at.desc(),
            "-created_at": Deal.created_at.desc(),
            "title": func.lower(Deal.title),
            "contact_name": func.lower(Contact.name),
        }[query.sort]
        rows = session.scalars(
            base.order_by(order, Deal.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).all()
        return {
            **page_result(deal_views(session, rows), total, query),
            "stage_counts": {stage: counts.get(stage, 0) for stage in STAGES},
        }


def read_children(
    database: Database, token: str, did: UUID, kind: str, query: ChildQuery
) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        authorized(session, current_identity(session, token), did)
        if kind == "customer-offers":
            base = select(CustomerOffer).where(CustomerOffer.deal_id == did)
            total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
            rows = session.scalars(
                base.order_by(CustomerOffer.created_at.desc(), CustomerOffer.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            ).all()
            items = [customer_offer_view(row) for row in rows]
        else:
            events = select(DealStageEvent).where(DealStageEvent.deal_id == did)
            total = session.scalar(select(func.count()).select_from(events.subquery())) or 0
            event_rows = session.scalars(
                events.order_by(DealStageEvent.after_version.desc(), DealStageEvent.id)
                .offset((query.page - 1) * query.page_size)
                .limit(query.page_size)
            ).all()
            items = event_views(session, event_rows)
        return page_result(items, total, query)
