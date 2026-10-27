"""Selected dashboard PostgreSQL acceptance, prepared for final isolated-stack review."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from app.project_links.contracts import NewLink
from app.reports.contracts import PeriodQuery
from app.reports.queries import dashboard
from app.reports.workspace import METRICS, agents, overview, records
from app.reports.workspace_contracts import WorkspaceAgents, WorkspaceQuery, WorkspaceRecords
from app.schedule.rules import ZONE
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new as new_deal
from tests.deal_support import run as save_deal
from tests.test_developments import development
from tests.test_inventory import property_draft
from tests.test_outcomes import sale_fixture
from tests.test_ownership import change, cid, intent
from tests.test_project_links import change as link
from tests.test_schedule import booking
from tests.test_schedule import run as save_visit
from tests.test_work import new as new_task
from tests.test_work import run as save_task

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def populated(settings, database):
    uid, token = actor(settings, database)
    lead = create_lead(settings, database, token, new_lead(status="follow_up"))
    contact, enquiry = cid(lead), UUID(lead["id"])
    deal = UUID(save_deal(settings, database, token, new_deal(contact))["id"])
    clock = datetime.now(UTC).replace(second=0, microsecond=0)
    today = clock.astimezone(ZONE).date()
    query = WorkspaceQuery(start_on=today - timedelta(days=1), end_on=today + timedelta(days=7))
    for index in range(3):
        start = clock + timedelta(hours=2 + index * 2)
        save_visit(
            settings,
            database,
            token,
            booking(
                uid,
                contact,
                enquiry_id=enquiry,
                type="office",
                start_at=start,
                end_at=start + timedelta(minutes=45),
            ),
        )
    save_visit(
        settings,
        database,
        token,
        booking(
            uid,
            contact,
            enquiry_id=enquiry,
            type="office",
            start_at=clock - timedelta(hours=2),
            end_at=clock - timedelta(hours=1),
        ),
    )
    for index in range(4):
        save_task(
            settings,
            database,
            token,
            new_task(
                uid,
                contact,
                enquiry_id=enquiry,
                title=f"Tâche synthétique {index}",
                due_at=clock - timedelta(minutes=15 + index),
            ),
        )
    return uid, token, contact, deal, clock, query


def test_full_scoped_totals_match_numbered_records_and_preview_limits(settings, database):
    uid, token, _, _, clock, query = populated(settings, database)
    result = overview(database, token, query, clock)
    expected = {"enquiries": 1, "active_deals": 1, "upcoming_visits": 3, "follow_ups": 1}
    assert {key: value["total"] for key, value in result["kpis"].items()} == expected
    assert sum(result["pipeline"].values()) == 1
    assert result["visits"]["total"] == 3 and len(result["visits"]["items"]) == 2
    assert result["tasks"]["total"] == 4 and result["tasks"]["overdue_total"] == 4
    assert len(result["tasks"]["items"]) == 3
    for metric in METRICS:
        detail = records(
            database,
            token,
            WorkspaceRecords(metric=metric, page_size=1, **query.model_dump()),
            clock,
        )
        assert detail["total"] == expected[metric] and len(detail["items"]) == 1
    second = records(
        database,
        token,
        WorkspaceRecords(metric="upcoming_visits", page=2, page_size=2, **query.model_dump()),
        clock,
    )
    assert second["total"] == 3 and len(second["items"]) == 1 and second["has_previous"]
    assert agents(database, token, WorkspaceAgents())["items"][0]["id"] == str(uid)


def test_private_and_copied_assignment_filters_never_grant_counts_then_transfer_rechecks_scope(
    settings, database
):
    uid, token, contact, _, clock, query = populated(settings, database)
    other_id, private = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    copied = query.model_copy(update={"assigned_agent_id": uid})
    hidden = overview(database, private, copied, clock)
    assert all(metric["total"] == 0 for metric in hidden["kpis"].values())
    assert all(
        hidden[key]["items"] == [] for key in ("visits", "follow_ups", "tasks", "inventory", "team")
    )
    assert agents(database, private, WorkspaceAgents())["total"] == 0
    assert overview(database, manager, copied, clock)["kpis"]["upcoming_visits"]["total"] == 3
    change(settings, database, manager, contact, intent("assign", primary_agent_id=other_id))
    assert all(
        metric["total"] == 0 for metric in overview(database, token, query, clock)["kpis"].values()
    )
    assert overview(database, private, query, clock)["kpis"]["upcoming_visits"]["total"] == 3
    assert overview(database, private, copied, clock)["kpis"]["upcoming_visits"]["total"] == 0


def test_catalogue_links_and_qualified_uuid_interests_are_deduplicated(settings, database):
    _, token, contact, deal, clock, query = populated(settings, database)
    property_id = property_draft(settings, database, token)
    project = development(settings, database, token)
    for kind in ("discussed", "visited"):
        link(settings, database, token, "deals", deal, NewLink(kind=kind, property_id=property_id))
    link(
        settings, database, token, "deals", deal, NewLink(kind="discussed", development_id=project)
    )
    qualified_property = property_draft(settings, database, token)
    save_deal(
        settings, database, token, new_deal(contact, projects=[{"property_id": qualified_property}])
    )
    summary = overview(database, token, query, clock)
    assert summary["inventory"]["total"] == 3
    assert {(row["kind"], row["id"]) for row in summary["inventory"]["items"]} == {
        ("property", str(property_id)),
        ("development", str(project)),
        ("property", str(qualified_property)),
    }
    assert all(row["deal_count"] == 1 for row in summary["inventory"]["items"])
    assert all("owner" not in key for row in summary["inventory"]["items"] for key in row)


def test_team_filter_preserves_closing_attribution_after_current_portfolio_transfer(
    settings, database
):
    _, contact, manager, _, _, _, _, _ = sale_fixture(settings, database)
    period = PeriodQuery(start_on="2026-10-01", end_on="2026-10-31")
    original = next(
        metric
        for metric in dashboard(database, manager, period)["metrics"]
        if metric["key"] == "won"
    )
    closing_owner = UUID(original["series"][0]["id"])
    new_owner, _ = actor(settings, database)
    change(settings, database, manager, contact, intent("assign", primary_agent_id=new_owner))
    original_filter = WorkspaceQuery(**period.model_dump(), assigned_agent_id=closing_owner)
    new_filter = WorkspaceQuery(**period.model_dump(), assigned_agent_id=new_owner)
    assert overview(database, manager, original_filter)["outcomes"]["won"] == original["total"]
    assert overview(database, manager, new_filter)["outcomes"]["won"] == 0
