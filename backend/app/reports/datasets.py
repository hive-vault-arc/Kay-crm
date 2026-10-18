"""One SQL rowset per metric, reused verbatim by totals, chart groups and pages."""

from dataclasses import dataclass
from datetime import UTC, datetime, time, timedelta
from typing import Any

from sqlalchemy import Select, String, and_, cast, func, literal, or_, select, true, union_all
from sqlalchemy.orm import aliased
from sqlalchemy.sql.selectable import CTE

from app.contacts.access import contact_scope
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, Enquiry
from app.deals.models import Deal
from app.deals.outcome_models import DealOutcome, DealReopening
from app.finance.models import Commission, Receipt
from app.identity.models import User
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.inventory.hierarchy_models import Development
from app.inventory.models import Offering, Property
from app.reports.contracts import PeriodQuery
from app.requirements.models import Requirement, ShortlistEntry
from app.schedule.rules import ZONE

EXCLUDED_ACTIVITY = (
    "deals.stock.flagged",
    "deals.contact_merged",
    "tasks.contact_merged",
    "visits.contact_merged",
    "contacts.merge",
)
ACTIVE = ("new", "visit", "negotiation", "reserved", "documents")


def contacts(identity: CurrentIdentity) -> Select[Any]:
    return select(Contact).where(contact_scope(identity), Contact.archived_at.is_(None))


def offering_scope(identity: CurrentIdentity, contact_ids: Select[Any] | None = None) -> Any:
    if identity.user.role != "agent":
        return true()
    cids = contacts(identity).with_only_columns(Contact.id) if contact_ids is None else contact_ids
    deals = select(Deal.offering_id).where(Deal.contact_id.in_(cids))
    shortlists = (
        select(ShortlistEntry.offering_id).join(Requirement).where(Requirement.contact_id.in_(cids))
    )
    return or_(Offering.id.in_(deals), Offering.id.in_(shortlists))


@dataclass(frozen=True)
class ReportScope:
    contacts: CTE
    offerings: CTE


def snapshot_scope(identity: CurrentIdentity) -> ReportScope:
    cids = (
        contacts(identity)
        .with_only_columns(Contact.id)
        .cte("report_contacts")
        .prefix_with("MATERIALIZED", dialect="postgresql")
    )
    offerings = (
        select(Offering.id, Offering.property_id, Offering.development_id)
        .where(offering_scope(identity, select(cids.c.id)))
        .cte("report_offerings")
        .prefix_with("MATERIALIZED", dialect="postgresql")
    )
    return ReportScope(cids, offerings)


def stock_scope(identity: CurrentIdentity, kind: str, scope: ReportScope | None = None) -> Any:
    if identity.user.role != "agent":
        return true()
    scoped = (
        select(scope.offerings)
        if scope is not None
        else select(Offering).where(offering_scope(identity))
    )
    property_ids = scoped.with_only_columns(scoped.selected_columns.property_id)
    development_ids = scoped.with_only_columns(scoped.selected_columns.development_id)
    if kind == "property":
        return Property.id.in_(property_ids)
    property_projects = select(Property.development_id).where(Property.id.in_(property_ids))
    return or_(
        Development.id.in_(development_ids),
        Development.id.in_(property_projects),
    )


def dataset(
    identity: CurrentIdentity,
    metric: str,
    period: PeriodQuery,
    now: datetime,
    scope: ReportScope | None = None,
) -> Select[Any]:
    start, end = period.resolved(now)
    lower = datetime.combine(start, time(), ZONE).astimezone(UTC)
    upper = datetime.combine(end + timedelta(days=1), time(), ZONE).astimezone(UTC)
    cids = (
        select(scope.contacts.c.id)
        if scope is not None
        else contacts(identity).with_only_columns(Contact.id)
    )
    blank = literal(None, String)

    one = literal(1)

    def rows(
        identifier: Any,
        label: Any,
        kind: str,
        aid: Any = blank,
        name: Any = blank,
        value: Any = one,
        target: Any = None,
    ) -> Select[Any]:
        return select(
            cast(identifier, String).label("id"),
            label.label("label"),
            literal(kind).label("kind"),
            cast(aid, String).label("attribution_id"),
            name.label("attribution_label"),
            value.label("value"),
            cast(identifier if target is None else target, String).label("target_id"),
        )

    if metric == "contacts":
        return (
            rows(Contact.id, Contact.name, "contact", User.id, User.display_name)
            .join(User, User.id == Contact.primary_agent_id)
            .where(Contact.id.in_(cids))
        )
    if metric == "enquiries":
        return (
            rows(Enquiry.id, Contact.name, "enquiry")
            .join(Contact, Contact.id == Enquiry.contact_id)
            .where(
                Enquiry.contact_id.in_(cids),
                Enquiry.received_at >= lower,
                Enquiry.received_at < upper,
            )
        )
    if metric == "active_deals":
        return (
            rows(Deal.id, Deal.title, "deal", User.id, User.display_name)
            .join(Contact, Contact.id == Deal.contact_id)
            .join(User, User.id == Contact.primary_agent_id)
            .where(Deal.contact_id.in_(cids), Deal.stage.in_(ACTIVE))
        )
    if metric in ("won", "lost", "cancelled"):
        return (
            rows(
                DealOutcome.id,
                Deal.title,
                "outcome",
                DealOutcome.primary_agent_at_close_id,
                User.display_name,
                target=DealOutcome.deal_id,
            )
            .join(Deal, Deal.id == DealOutcome.deal_id)
            .join(User, User.id == DealOutcome.primary_agent_at_close_id)
            .where(
                Deal.contact_id.in_(cids),
                DealOutcome.outcome == metric,
                DealOutcome.completed_on >= start,
                DealOutcome.completed_on <= end,
                ~select(DealReopening.id)
                .where(DealReopening.outcome_id == DealOutcome.id)
                .exists(),
            )
        )
    if metric == "activities":
        return (
            rows(
                TimelineEvent.id,
                Contact.name,
                "activity",
                TimelineEvent.actor_user_id,
                User.display_name,
                target=TimelineEvent.contact_id,
            )
            .join(Contact, Contact.id == TimelineEvent.contact_id)
            .join(User, User.id == TimelineEvent.actor_user_id)
            .where(
                TimelineEvent.contact_id.in_(cids),
                TimelineEvent.occurred_at >= lower,
                TimelineEvent.occurred_at < upper,
                TimelineEvent.action.not_in(EXCLUDED_ACTIVITY),
            )
        )
    if metric == "collections":
        if identity.user.role == "agent":
            raise IdentityError("FORBIDDEN", 403)
        replacement = aliased(Receipt)
        return (
            rows(Receipt.id, Deal.title, "receipt", value=Receipt.amount_mad, target=Deal.id)
            .join(Commission, Commission.id == Receipt.commission_id)
            .join(Deal, Deal.id == Commission.deal_id)
            .where(
                Deal.contact_id.in_(cids),
                Receipt.received_on >= start,
                Receipt.received_on <= end,
                Receipt.amount_mad.is_not(None),
                ~select(replacement.id).where(replacement.supersedes_id == Receipt.id).exists(),
            )
        )
    if metric == "developments":
        return rows(Development.id, Development.name, "development").where(
            Development.archived_at.is_(None), stock_scope(identity, "development", scope)
        )
    if metric in ("units", "standalone"):
        return rows(Property.id, Property.reference, "property").where(
            stock_scope(identity, "property", scope),
            Property.development_id.is_not(None)
            if metric == "units"
            else Property.development_id.is_(None),
        )
    return (
        rows(
            Offering.id,
            func.coalesce(Property.reference, Development.name),
            "property" if metric == "property_offerings" else "development",
            target=func.coalesce(Offering.property_id, Offering.development_id),
        )
        .outerjoin(Property, Property.id == Offering.property_id)
        .outerjoin(Development, Development.id == Offering.development_id)
        .where(
            Offering.id.in_(select(scope.offerings.c.id))
            if scope is not None and identity.user.role == "agent"
            else offering_scope(identity),
            Offering.is_current,
            Offering.property_id.is_not(None)
            if metric == "property_offerings"
            else and_(Offering.development_id.is_not(None), Development.archived_at.is_(None)),
        )
    )


def exceptions(identity: CurrentIdentity, kind: str, now: datetime) -> Any:
    if kind == "inactive_deals":
        last = (
            select(func.max(TimelineEvent.occurred_at))
            .where(
                TimelineEvent.deal_id == Deal.id,
                TimelineEvent.contact_id == Deal.contact_id,
                TimelineEvent.action.not_in(EXCLUDED_ACTIVITY),
                TimelineEvent.occurred_at <= now,
            )
            .correlate(Deal)
            .scalar_subquery()
        )
        baseline = func.greatest(Deal.created_at, func.coalesce(last, Deal.created_at))
        return select(
            cast(Deal.id, String).label("id"),
            Deal.title.label("label"),
            literal("deal").label("kind"),
            baseline.label("last_at"),
            cast(Deal.id, String).label("target_id"),
        ).where(
            Deal.contact_id.in_(contacts(identity).with_only_columns(Contact.id)),
            Deal.stage.in_(ACTIVE),
            baseline <= now - timedelta(days=14),
        )
    available = (
        offering_scope(identity),
        Offering.state == "available",
        Offering.is_current,
        Offering.availability_confirmed_at <= now - timedelta(days=30),
    )
    physical = (
        select(
            cast(Property.id, String).label("id"),
            Property.reference.label("label"),
            literal("property").label("kind"),
            func.min(Offering.availability_confirmed_at).label("last_at"),
            cast(Property.id, String).label("target_id"),
        )
        .join(Offering, Offering.property_id == Property.id)
        .where(*available)
        .group_by(Property.id)
    )
    whole = (
        select(
            cast(Offering.id, String).label("id"),
            Development.name.label("label"),
            literal("development").label("kind"),
            Offering.availability_confirmed_at.label("last_at"),
            cast(Development.id, String).label("target_id"),
        )
        .join(Development, Development.id == Offering.development_id)
        .where(*available, Development.archived_at.is_(None))
    )
    return union_all(physical, whole)
