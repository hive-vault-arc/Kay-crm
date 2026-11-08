"""Connection-forbidden dashboard contracts, compiled SQL and projection boundaries."""

from contextlib import nullcontext
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql.selectable import CompoundSelect

from app.identity.security import IdentityError
from app.reports import workspace
from app.reports.workspace_contracts import WorkspaceAgents, WorkspaceQuery, WorkspaceRecords
from app.reports.workspace_previews import inventory, team_source
from app.reports.workspace_sources import contact_snapshot, metric_source, previous_period

CLOCK = datetime(2030, 1, 7, 10, tzinfo=UTC)
PERIOD = WorkspaceQuery(start_on=date(2030, 1, 1), end_on=date(2030, 1, 31))


def identity(role="agent"):
    return SimpleNamespace(user=SimpleNamespace(id=uuid4(), role=role))


class Rows:
    def __init__(self, rows=()):
        self.rows = rows

    def __iter__(self):
        return iter(self.rows)

    def mappings(self):
        return self

    def all(self):
        return list(self.rows)

    def one(self):
        return (0, 0)


class CompilingSession:
    def __init__(self):
        self.statements = []

    def compile(self, statement):
        compiled = statement.compile(dialect=postgresql.dialect())
        sql = str(compiled)
        assert not sql.lstrip().startswith(("INSERT", "UPDATE", "DELETE", "ALTER"))
        self.statements.append((sql, compiled.params))
        return compiled

    def execute(self, statement):
        self.compile(statement)
        if isinstance(statement, CompoundSelect):
            return Rows(
                [
                    (key, "", 0)
                    for key in (
                        *workspace.METRICS,
                        "previous_enquiries",
                        "previous_follow_ups",
                        "won",
                        "lost",
                        "cancelled",
                    )
                ]
            )
        return Rows()

    def scalar(self, statement):
        self.compile(statement)
        return 0

    def scalars(self, statement):
        self.compile(statement)
        return Rows()


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_complete_zero_dashboard_compiles_all_sources_and_previews_without_database(role):
    session = CompilingSession()
    query = PERIOD.model_copy(update={"assigned_agent_id": uuid4()})
    result = workspace.summary(session, identity(role), query, CLOCK)
    assert result["scope"] == ("assigned_or_shared" if role == "agent" else "agency")
    assert result["assigned_agent_id"] == str(query.assigned_agent_id)
    assert all(metric["total"] == 0 for metric in result["kpis"].values())
    assert all(
        result[key]["items"] == [] for key in ("visits", "follow_ups", "tasks", "inventory", "team")
    )
    assert result["tasks"]["overdue_total"] == 0 and sum(result["pipeline"].values()) == 0
    assert result["previous_period"] == {"start_on": "2029-12-01", "end_on": "2029-12-31"}
    sql = "\n".join(statement for statement, _ in session.statements)
    assert "MATERIALIZED" in sql and "merged_into_contact_id IS NULL" in sql
    assert "primary_agent_id" in sql and "archived_at IS NULL" in sql
    assert "workspace_outcome_contacts" in sql and "deal_outcome.primary_agent_at_close_id =" in sql
    assert ("contact_collaborator" in sql) is (role == "agent")
    assert (
        "property_owner" not in sql and "contact_phone" not in sql and "finance_receipt" not in sql
    )


def test_unknown_authority_clock_metric_and_unbounded_query_fields_are_rejected():
    for body in (
        {"role": "administrator"},
        {"now": CLOCK},
        {"scope": "agency"},
        {"start_on": "1899-12-31", "end_on": "1900-01-01"},
        {"start_on": "2030-01-01", "end_on": "2032-01-01"},
    ):
        with pytest.raises(ValidationError):
            WorkspaceQuery.model_validate(body)
    for body in (
        {"metric": "collections"},
        {"metric": "contacts"},
        {"metric": "follow_ups", "page_size": 101},
        {"metric": "follow_ups", "page": 0},
    ):
        with pytest.raises(ValidationError):
            WorkspaceRecords.model_validate(body)
    with pytest.raises(ValidationError):
        WorkspaceAgents(q="x" * 161)


def test_equal_length_previous_cohort_and_supported_year_boundary():
    query = WorkspaceQuery(start_on="2028-03-01", end_on="2028-03-03", assigned_agent_id=uuid4())
    previous = previous_period(query, CLOCK)
    assert previous.start_on == date(2028, 2, 27) and previous.end_on == date(2028, 2, 29)
    assert previous.assigned_agent_id == query.assigned_agent_id
    assert (
        previous_period(WorkspaceQuery(start_on="1900-01-01", end_on="1900-01-31"), CLOCK) is None
    )


def test_future_visits_and_current_followup_cohort_share_scoped_sources_but_not_fake_history():
    who = identity()
    contacts = contact_snapshot(who, PERIOD)
    visits = metric_source(who, PERIOD, CLOCK, "upcoming_visits", contacts).compile(
        dialect=postgresql.dialect()
    )
    sql = str(visits)
    assert "visit.end_at >=" in sql and "visit.start_at <" in sql and "visit.status IN" in sql
    assert ["scheduled", "confirmed"] in visits.params.values()
    assert CLOCK in visits.params.values()
    followups = metric_source(who, PERIOD, CLOCK, "follow_ups", contacts).compile(
        dialect=postgresql.dialect()
    )
    assert "enquiry.converted_at IS NULL" in str(followups)
    assert "follow_up" in followups.params.values()
    with pytest.raises(ValueError, match="UNKNOWN_WORKSPACE_METRIC"):
        metric_source(who, PERIOD, CLOCK, "collections", contacts)


def test_identity_is_checked_before_any_dashboard_source_and_denial_exposes_nothing(monkeypatch):
    session = CompilingSession()
    database = SimpleNamespace(session=lambda: nullcontext(session))

    def denied(*args):
        raise IdentityError("UNAUTHENTICATED", 401)

    monkeypatch.setattr(workspace, "current_identity", denied)
    for method, query in (
        (workspace.overview, PERIOD),
        (workspace.records, WorkspaceRecords(metric="enquiries")),
        (workspace.agents, WorkspaceAgents()),
    ):
        session.statements.clear()
        with pytest.raises(IdentityError, match="UNAUTHENTICATED"):
            method(database, "synthetic", query)
        assert len(session.statements) == 1
        assert "REPEATABLE READ, READ ONLY" in session.statements[0][0]


def test_team_query_aggregates_each_cohort_before_joining_to_avoid_cartesian_counts():
    statement = team_source(contact_snapshot(identity(), PERIOD), PERIOD, CLOCK).compile(
        dialect=postgresql.dialect()
    )
    sql = str(statement)
    assert sql.count("GROUP BY contact.primary_agent_id") == 2
    assert sql.count("LEFT OUTER JOIN (SELECT") == 2


def test_inventory_keeps_exact_current_campaigns_and_disambiguates_target_kinds():
    target = uuid4()
    entries = [
        dict(
            id=target,
            kind=kind,
            reference="SYN",
            label="Synthetic catalogue",
            category="house",
            location=None,
            deal_count=2,
        )
        for kind in ("property", "development")
    ]

    class InventorySession(CompilingSession):
        def scalar(self, statement):
            self.compile(statement)
            return 2

        def execute(self, statement):
            self.compile(statement)
            return Rows(entries)

        def scalars(self, statement):
            compiled = self.compile(statement)
            assert "offering.is_current IS true" in str(compiled)
            return Rows(
                [
                    SimpleNamespace(
                        id=uuid4(),
                        property_id=target,
                        development_id=None,
                        kind="sale",
                        state="available",
                        price_mad=Decimal("9007199254740993.42"),
                        price_period=None,
                    )
                ]
            )

    session = InventorySession()
    result = inventory(session, contact_snapshot(identity(), PERIOD))
    assert result["total"] == 2 and len(result["items"]) == 2
    assert result["items"][0]["campaigns"][0]["price_mad"] == "9007199254740993.42"
    assert result["items"][1]["campaigns"] == []
    sql = session.statements[0][0]
    assert "UNION" in sql and "count(distinct(" in sql
    assert "deal_project.property_id IS NOT NULL" in sql
    assert "property_owner" not in sql
