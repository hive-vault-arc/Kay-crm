"""One read-only snapshot for the selected dashboard, with current role/scope first."""

from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy import Select, func, literal, select, text, union_all
from sqlalchemy.orm import Session

from app.contacts.models import Contact
from app.db.session import Database
from app.deals.models import Deal
from app.deals.outcome_models import DealOutcome
from app.identity.models import User
from app.identity.sessions import CurrentIdentity, current_identity
from app.reports.datasets import dataset
from app.reports.queries import href, metadata
from app.reports.workspace_contracts import (
    WorkspaceAgents,
    WorkspaceMetric,
    WorkspaceQuery,
    WorkspaceRecords,
)
from app.reports.workspace_previews import follow_ups, inventory, tasks, team, upcoming
from app.reports.workspace_sources import (
    contact_ids,
    contact_snapshot,
    metric_source,
    previous_period,
    report_scope,
)
from app.work.queries import page

METRICS: tuple[WorkspaceMetric, ...] = (
    "enquiries",
    "active_deals",
    "upcoming_visits",
    "follow_ups",
)
COMPARABLE: tuple[WorkspaceMetric, ...] = ("enquiries", "follow_ups")
STAGES = ("new", "visit", "negotiation", "documents", "reserved")


def count_statement(key: str, source: Select[*tuple[Any, ...]]) -> Select[*tuple[Any, ...]]:
    return select(
        literal(key).label("metric"),
        literal("").label("dimension"),
        func.count().label("total"),
    ).select_from(source.subquery())


def context(query: WorkspaceQuery, clock: datetime, role: str) -> dict[str, object]:
    return metadata(query, clock, role) | {
        "assigned_agent_id": str(query.assigned_agent_id) if query.assigned_agent_id else None,
    }


def overview(
    database: Database, token: str, query: WorkspaceQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = now or datetime.now(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        return summary(session, identity, query, clock)


def summary(
    session: Session, identity: CurrentIdentity, query: WorkspaceQuery, clock: datetime
) -> dict[str, object]:
    contacts = contact_snapshot(identity, query)
    sources = {key: metric_source(identity, query, clock, key, contacts) for key in METRICS}
    statements = [count_statement(key, source) for key, source in sources.items()]
    previous = previous_period(query, clock)
    if previous:
        statements.extend(
            count_statement(
                f"previous_{key}", metric_source(identity, previous, clock, key, contacts)
            )
            for key in COMPARABLE
        )
    outcome_contacts = (
        contact_snapshot(
            identity,
            query.model_copy(update={"assigned_agent_id": None}),
            name="workspace_outcome_contacts",
        )
        if query.assigned_agent_id
        else contacts
    )
    scope = report_scope(identity, outcome_contacts)
    for key in ("won", "lost", "cancelled"):
        outcome = dataset(identity, key, query, clock, scope)
        if query.assigned_agent_id:
            outcome = outcome.where(
                DealOutcome.primary_agent_at_close_id == query.assigned_agent_id
            )
        statements.append(count_statement(key, outcome))
    statements.append(
        sources["active_deals"]
        .with_only_columns(
            literal("stage").label("metric"),
            Deal.stage.label("dimension"),
            func.count().label("total"),
        )
        .group_by(Deal.stage)
    )
    counts: dict[str, int] = {}
    stages = dict.fromkeys(STAGES, 0)
    for metric, dimension, total in session.execute(union_all(*statements)):
        if metric == "stage":
            stages[cast(str, dimension)] = cast(int, total)
        else:
            counts[cast(str, metric)] = cast(int, total)
    kpis: dict[str, dict[str, object]] = {key: {"total": counts[key]} for key in METRICS}
    for key in COMPARABLE:
        kpis[key]["previous_total"] = counts[f"previous_{key}"] if previous else None
    return context(query, clock, identity.user.role) | {
        "previous_period": {"start_on": str(previous.start_on), "end_on": str(previous.end_on)}
        if previous
        else None,
        "kpis": kpis,
        "pipeline": stages,
        "outcomes": {key: counts[key] for key in ("won", "lost", "cancelled")},
        "visits": upcoming(session, sources["upcoming_visits"], counts["upcoming_visits"]),
        "follow_ups": follow_ups(session, sources["follow_ups"], counts["follow_ups"]),
        "tasks": tasks(session, contacts, clock),
        "inventory": inventory(session, contacts),
        "team": team(session, contacts, query, clock),
    }


def records(
    database: Database, token: str, query: WorkspaceRecords, now: datetime | None = None
) -> dict[str, object]:
    clock = now or datetime.now(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        source = metric_source(
            identity, query, clock, query.metric, contact_snapshot(identity, query)
        ).subquery()
        total = session.scalar(select(func.count()).select_from(source)) or 0
        rows = session.execute(
            select(source)
            .order_by(source.c.label, source.c.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).mappings()
        items = [
            {
                "id": row["id"],
                "label": row["label"],
                "kind": row["kind"],
                "href": f"/visits/{row['target_id']}"
                if row["kind"] == "visit"
                else href(row["kind"], row["target_id"]),
                "attribution_label": row["attribution_label"],
            }
            for row in rows
        ]
        return (
            context(query, clock, identity.user.role)
            | page(items, total, query)
            | {"metric": query.metric}
        )


def agents(database: Database, token: str, query: WorkspaceAgents) -> dict[str, object]:
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        source = select(User.id, User.display_name).where(
            User.id.in_(
                select(Contact.primary_agent_id).where(Contact.id.in_(contact_ids(identity))),
            )
        )
        if query.q:
            escaped = query.q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            source = source.where(User.display_name.ilike(f"%{escaped}%", escape="\\"))
        total = session.scalar(select(func.count()).select_from(source.subquery())) or 0
        rows = session.execute(
            source.order_by(User.display_name, User.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).mappings()
        return page(
            [{"id": str(row["id"]), "display_name": row["display_name"]} for row in rows],
            total,
            query,
        )
