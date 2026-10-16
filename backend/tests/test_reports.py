"""SP-17 scope, attribution, alert boundaries and SQL rowset parity on PostgreSQL."""

from datetime import timedelta
from uuid import UUID

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select

from app.contacts.history_models import TimelineEvent
from app.deals.models import Deal
from app.identity.security import IdentityError
from app.inventory.models import Offering
from app.reports.contracts import DrillQuery, ExceptionQuery, PeriodQuery
from app.reports.queries import dashboard, drill_down, exception_list
from tests.contact_support import actor
from tests.deal_support import new, run, setup
from tests.test_outcomes import body, sale_fixture
from tests.test_ownership import change, intent, note

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]
PERIOD = PeriodQuery(start_on="2026-10-01", end_on="2026-10-31")


def metrics(database, token, period=PERIOD):
    return {m["key"]: m for m in dashboard(database, token, period)["metrics"]}


def test_empty_zero_role_projection_and_all_metric_drill_parity(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    for token in (manager, agent):
        report = dashboard(database, token, PERIOD)
        assert report["time_zone"] == "Africa/Casablanca"
        for metric in report["metrics"]:
            assert metric["total"] == 0 and metric["series"] == []
            detail = drill_down(
                database, token, DrillQuery(metric=metric["key"], **PERIOD.model_dump())
            )
            assert detail["total"] == 0 and detail["items"] == []
            assert detail["metric"]["value"] == metric["value"]
    assert "collections" not in metrics(database, agent)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        drill_down(database, agent, DrillQuery(metric="collections"))


def test_transfer_collaborator_true_actor_current_owner_and_private_counts(settings, database):
    uid, agent, contact, _ = setup(settings, database)
    other_id, other = actor(settings, database)
    _, private = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    did = UUID(run(settings, database, agent, new(contact))["id"])
    change(
        settings, database, manager, contact, intent("collaborators", collaborator_ids=[other_id])
    )
    note(settings, database, other, contact)
    before = metrics(database, manager)
    assert before["contacts"]["series"] == [
        {"id": str(uid), "label": before["contacts"]["series"][0]["label"], "value": 1}
    ]
    assert metrics(database, other)["contacts"]["total"] == 1
    actions = {p["id"]: p["value"] for p in before["activities"]["series"]}
    assert actions[str(other_id)] == 1
    assert all(m["total"] == 0 for m in metrics(database, private).values())
    change(
        settings,
        database,
        manager,
        contact,
        intent("assign", version=2, primary_agent_id=other_id),
    )
    after = metrics(database, manager)
    assert after["contacts"]["series"][0]["id"] == str(other_id)
    assert all(m["total"] == 0 for m in metrics(database, agent).values())
    detail = drill_down(database, other, DrillQuery(metric="active_deals"))
    assert detail["items"][0]["href"] == f"/deals/{did}"
    copied = drill_down(database, private, DrillQuery(metric="contacts", attribution_id=other_id))
    assert copied["total"] == 0 and copied["items"] == []


def test_outcome_snapshot_survives_transfer_and_reopen_adjusts_results(settings, database):
    token, contact, manager, _, _, _, _, did = sale_fixture(settings, database)
    run(settings, database, token, body(database, token, did), did)
    won = metrics(database, manager)["won"]
    assert won["total"] == 1
    historical_owner = won["series"][0]["id"]
    new_id, new_token = actor(settings, database)
    change(
        settings,
        database,
        manager,
        contact,
        intent("assign", primary_agent_id=new_id),
    )
    after = metrics(database, manager)
    assert after["contacts"]["series"][0]["id"] == str(new_id)
    assert after["won"]["series"][0]["id"] == historical_owner
    detail = drill_down(database, new_token, DrillQuery(metric="won", **PERIOD.model_dump()))
    assert detail["items"][0]["href"] == f"/deals/{did}"
    run(settings, database, new_token, body(database, new_token, did, reopen=True), did)
    assert metrics(database, manager)["won"]["total"] == 0
    assert metrics(database, manager)["active_deals"]["total"] == 2


def test_exact_elapsed_29_30_and_13_14_no_mutation(settings, database):
    token, _, manager, _, _, did, sale, _ = sale_fixture(settings, database)
    with database.session() as session:
        confirmed = session.get(Offering, sale).availability_confirmed_at
        last = session.scalar(
            select(func.max(TimelineEvent.occurred_at)).where(TimelineEvent.deal_id == did)
        )
        state = session.get(Deal, did).stage
    q = ExceptionQuery(kind="stale_inventory")
    at29 = exception_list(database, manager, q, confirmed + timedelta(days=29))
    at30 = exception_list(database, manager, q, confirmed + timedelta(days=30))
    assert at29["total"] == 0 and at30["total"] == 1
    assert at30["items"][0]["kind"] == "property"
    inactive = ExceptionQuery(kind="inactive_deals")
    assert not any(
        v["id"] == str(did)
        for v in exception_list(database, token, inactive, last + timedelta(days=13))["items"]
    )
    assert any(
        v["id"] == str(did)
        for v in exception_list(database, token, inactive, last + timedelta(days=14))["items"]
    )
    with database.session() as session:
        assert session.get(Deal, did).stage == state
        assert session.get(Offering, sale).state == "available"


@pytest.mark.parametrize(
    "fields",
    [
        {"start_on": "2026-10-01"},
        {"start_on": "2026-10-15", "end_on": "2026-10-14"},
        {"start_on": "2025-01-01", "end_on": "2026-01-02"},
        {"role": "manager"},
        {"start_on": "1899-12-31", "end_on": "1900-01-01"},
    ],
)
def test_invalid_periods_are_rejected(fields):
    with pytest.raises(ValidationError):
        PeriodQuery.model_validate(fields)
