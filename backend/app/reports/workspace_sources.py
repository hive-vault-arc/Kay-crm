"""Current authorized contact intersection and exact selected-dashboard rowsets."""

from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import Select, String, cast, literal, or_, select
from sqlalchemy.sql.selectable import CTE

from app.contacts.access import contact_scope
from app.contacts.models import Contact, Enquiry
from app.deals.models import Deal
from app.deals.project_models import DealProject
from app.identity.models import User
from app.identity.sessions import CurrentIdentity
from app.inventory.models import Offering
from app.project_links.models import ProjectLink
from app.reports.contracts import PeriodQuery
from app.reports.datasets import ACTIVE, ReportScope, dataset, offering_scope
from app.reports.workspace_contracts import WorkspaceMetric, WorkspaceQuery
from app.schedule.models import Visit
from app.schedule.rules import ACTIVE as ACTIVE_VISITS
from app.schedule.rules import ZONE
from app.work.models import Task


def contact_ids(
    identity: CurrentIdentity, query: WorkspaceQuery | None = None
) -> Select[*tuple[Any, ...]]:
    statement = select(Contact.id).where(
        contact_scope(identity),
        Contact.archived_at.is_(None),
        Contact.merged_into_contact_id.is_(None),
    )
    return (
        statement.where(Contact.primary_agent_id == query.assigned_agent_id)
        if query and query.assigned_agent_id
        else statement
    )


def contact_snapshot(
    identity: CurrentIdentity, query: WorkspaceQuery, *, name: str = "workspace_contacts"
) -> CTE:
    return contact_ids(identity, query).cte(name).prefix_with("MATERIALIZED", dialect="postgresql")


def bounds(query: PeriodQuery, clock: datetime) -> tuple[datetime, datetime]:
    start, end = query.resolved(clock)
    return (
        datetime.combine(start, time(), ZONE).astimezone(UTC),
        datetime.combine(end + timedelta(days=1), time(), ZONE).astimezone(UTC),
    )


def previous_period(query: WorkspaceQuery, clock: datetime) -> WorkspaceQuery | None:
    start, end = query.resolved(clock)
    previous_start = start - timedelta(days=(end - start).days + 1)
    if previous_start < date(1900, 1, 1):
        return None
    return WorkspaceQuery(
        start_on=previous_start,
        end_on=start - timedelta(days=1),
        assigned_agent_id=query.assigned_agent_id,
    )


def report_scope(identity: CurrentIdentity, contacts: CTE) -> ReportScope:
    return ReportScope(
        contacts,
        select(Offering.id, Offering.property_id, Offering.development_id)
        .where(offering_scope(identity, select(contacts.c.id)))
        .cte("workspace_offerings"),
    )


def metric_source(
    identity: CurrentIdentity,
    query: WorkspaceQuery,
    clock: datetime,
    metric: WorkspaceMetric,
    contacts: CTE,
) -> Select[*tuple[Any, ...]]:
    cids = select(contacts.c.id)
    if metric in ("enquiries", "active_deals", "follow_ups"):
        scope = report_scope(identity, contacts)
        statement = dataset(
            identity, "enquiries" if metric == "follow_ups" else metric, query, clock, scope
        )
        return (
            statement.where(Enquiry.status == "follow_up", Enquiry.converted_at.is_(None))
            if metric == "follow_ups"
            else statement
        )
    if metric != "upcoming_visits":
        raise ValueError("UNKNOWN_WORKSPACE_METRIC")
    lower, upper = bounds(query, clock)
    return (
        select(
            cast(Visit.id, String).label("id"),
            Visit.title.label("label"),
            literal("visit").label("kind"),
            cast(Visit.organizer_user_id, String).label("attribution_id"),
            User.display_name.label("attribution_label"),
            literal(1).label("value"),
            cast(Visit.id, String).label("target_id"),
        )
        .join(User, User.id == Visit.organizer_user_id)
        .where(
            Visit.contact_id.in_(cids),
            Visit.status.in_(ACTIVE_VISITS),
            Visit.start_at >= lower,
            Visit.start_at < upper,
            Visit.end_at >= clock,
        )
    )


def open_tasks(contacts: CTE) -> Select[*tuple[Any, ...]]:
    return select(Task).where(Task.contact_id.in_(select(contacts.c.id)), Task.status == "open")


def active_deals(contacts: CTE) -> Select[*tuple[Any, ...]]:
    return select(Deal).where(
        Deal.contact_id.in_(select(contacts.c.id)),
        Deal.archived_at.is_(None),
        Deal.stage.in_(ACTIVE),
    )


def linked_targets(contacts: CTE) -> CTE:
    deals = active_deals(contacts).with_only_columns(Deal.id)
    explicit = select(
        ProjectLink.deal_id.label("deal_id"),
        ProjectLink.property_id.label("property_id"),
        ProjectLink.development_id.label("development_id"),
    ).where(ProjectLink.deal_id.in_(deals), ProjectLink.removed_at.is_(None))
    selected = (
        select(
            Deal.id.label("deal_id"),
            Offering.property_id.label("property_id"),
            Offering.development_id.label("development_id"),
        )
        .join(Offering, Offering.id == Deal.offering_id)
        .where(Deal.id.in_(deals))
    )
    interests = select(
        DealProject.deal_id.label("deal_id"),
        DealProject.property_id.label("property_id"),
        DealProject.development_id.label("development_id"),
    ).where(
        DealProject.deal_id.in_(deals),
        or_(DealProject.property_id.is_not(None), DealProject.development_id.is_not(None)),
    )
    # UUID-backed interests only. Never infer a catalogue identity from an external name.
    return explicit.union(selected, interests).cte("workspace_links")
