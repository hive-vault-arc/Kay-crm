"""Snapshot-scoped aggregates and numbered drill-downs share their source rowsets."""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, cast

from sqlalchemy import Select, func, select, text
from sqlalchemy.orm import Session

from app.db.session import Database
from app.identity.sessions import current_identity
from app.reports.contracts import DrillQuery, ExceptionQuery, PeriodQuery
from app.reports.datasets import dataset, exceptions
from app.work.queries import clock_context, page

LABELS = {
    "contacts": "Contacts actifs par responsable actuel",
    "enquiries": "Demandes reçues",
    "active_deals": "Affaires actives",
    "won": "Affaires gagnées non rouvertes",
    "lost": "Affaires perdues non rouvertes",
    "cancelled": "Affaires annulées non rouvertes",
    "activities": "Actions enregistrées par contributeur réel",
    "developments": "Programmes",
    "standalone": "Biens physiques autonomes",
    "units": "Unités physiques de programme",
    "property_offerings": "Offres de biens physiques",
    "development_offerings": "Offres de programme entier",
    "collections": "Encaissements valides corrigés",
}
PERIOD_METRICS = {"enquiries", "won", "lost", "cancelled", "activities", "collections"}
CHART_METRICS = {"contacts", "won", "activities"}


def aggregate(session: Session, statement: Select[Any], metric: str) -> dict[str, object]:
    source = statement.subquery()
    value = None
    series = []
    if metric in CHART_METRICS:
        groups = session.execute(
            select(source.c.attribution_id, source.c.attribution_label, func.count())
            .group_by(source.c.attribution_id, source.c.attribution_label)
            .order_by(source.c.attribution_label, source.c.attribution_id)
        ).all()
        series = [{"id": uid, "label": name, "value": count} for uid, name, count in groups]
        total = sum(cast(int, count) for _, _, count in groups)
    elif metric == "collections":
        count_value, value = session.execute(
            select(func.count(), func.coalesce(func.sum(source.c.value), 0)).select_from(source)
        ).one()
        total = cast(int, count_value)
    else:
        total = session.scalar(select(func.count()).select_from(source)) or 0
    return {
        "key": metric,
        "label": LABELS[metric],
        "total": total,
        "value": format(Decimal(str(value)), ".2f") if metric == "collections" else str(total),
        "unit": "MAD" if metric == "collections" else "count",
        "basis": "period" if metric in PERIOD_METRICS else "current",
        "denominator": "none",
        "series": series,
    }


def metadata(query: PeriodQuery, now: datetime, role: str) -> dict[str, object]:
    start, end = query.resolved(now)
    return {
        **clock_context(now),
        "start_on": str(start),
        "end_on": str(end),
        "scope": "assigned_or_shared" if role == "agent" else "agency",
    }


def dashboard(
    database: Database, token: str, query: PeriodQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = now or datetime.now(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        metrics = [
            aggregate(session, dataset(identity, metric, query, clock), metric)
            for metric in LABELS
            if metric != "collections" or identity.user.role != "agent"
        ]
        return metadata(query, clock, identity.user.role) | {"metrics": metrics}


def href(kind: str, target: str) -> str:
    prefix = {
        "contact": "/contacts/",
        "activity": "/contacts/",
        "enquiry": "/leads/",
        "deal": "/deals/",
        "outcome": "/deals/",
        "receipt": "/deals/",
        "property": "/projects/properties/",
        "development": "/projects/",
    }
    return (
        prefix.get(kind, "/projects?offering_id=")
        + target
        + ("?tab=finance" if kind == "receipt" else "")
    )


def drill_down(
    database: Database, token: str, query: DrillQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = now or datetime.now(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        source = dataset(identity, query.metric, query, clock).subquery()
        statement = select(source)
        if query.attribution_id:
            statement = statement.where(source.c.attribution_id == str(query.attribution_id))
        result = aggregate(session, statement, query.metric)
        rows = session.execute(
            statement.order_by(source.c.label, source.c.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).mappings()
        items = [
            {
                "id": row["id"],
                "label": row["label"],
                "kind": row["kind"],
                "href": href(row["kind"], row["target_id"]),
                "attribution_label": row["attribution_label"],
                "value": str(row["value"]),
            }
            for row in rows
        ]
        return (
            metadata(query, clock, identity.user.role)
            | page(items, int(str(result["total"])), query)
            | {"metric": result}
        )


def exception_list(
    database: Database, token: str, query: ExceptionQuery, now: datetime | None = None
) -> dict[str, object]:
    clock = now or datetime.now(UTC)
    with database.session() as session:
        session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        identity = current_identity(session, token)
        source = exceptions(identity, query.kind, clock).subquery()
        total = session.scalar(select(func.count()).select_from(source)) or 0
        rows = session.execute(
            select(source)
            .order_by(source.c.last_at, source.c.id)
            .offset((query.page - 1) * query.page_size)
            .limit(query.page_size)
        ).mappings()
        items = [
            {
                "id": row["id"],
                "label": row["label"],
                "kind": row["kind"],
                "href": href(row["kind"], row["target_id"]),
                "last_at": row["last_at"].isoformat(),
                "age_days": (clock - row["last_at"]).days,
            }
            for row in rows
        ]
        return (
            clock_context(clock)
            | page(items, total, query)
            | {
                "kind": query.kind,
                "threshold_days": 14 if query.kind == "inactive_deals" else 30,
                "scope": "assigned_or_shared" if identity.user.role == "agent" else "agency",
            }
        )
