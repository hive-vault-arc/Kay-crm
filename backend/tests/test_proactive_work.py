"""Contextual history and delayed internal work on isolated PostgreSQL."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import select

from app.activities.contracts import ActivityQuery
from app.activities.service import read_activities
from app.files.models import OutboxEvent
from app.identity.security import IdentityError
from app.schedule.contracts import FinishVisit
from app.schedule.queries import detail as visit_detail
from app.work.contracts import NotificationQuery, TaskAction
from app.work.notifications import read_notifications
from app.work.worker import run_once
from tests.contact_support import create_lead, new_lead
from tests.deal_support import new as new_deal
from tests.deal_support import run as deal_run
from tests.deal_support import setup
from tests.test_ownership import cid as contact_id
from tests.test_schedule import booking
from tests.test_schedule import run as visit_run
from tests.test_work import new
from tests.test_work import run as task_run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_multiple_prospects_require_explicit_task_context_and_keep_own_history(settings, database):
    uid, token, cid, first = setup(settings, database)
    second = UUID(
        create_lead(
            settings,
            database,
            token,
            new_lead(new_contact=None, contact_id=str(cid), message="Deuxième besoin synthétique"),
        )["id"]
    )
    with pytest.raises(IdentityError, match="ENQUIRY_CONTEXT_REQUIRED"):
        task_run(settings, database, token, new(uid, cid))
    tid = UUID(task_run(settings, database, token, new(uid, cid, enquiry_id=first))["id"])
    task_run(
        settings,
        database,
        token,
        TaskAction(expected_version=1, reason="Résultat synthétique"),
        tid,
        "completed",
    )
    first_actions = [
        item["action"]
        for item in read_activities(database, token, "enquiries", first, ActivityQuery())["items"]
    ]
    second_actions = [
        item["action"]
        for item in read_activities(database, token, "enquiries", second, ActivityQuery())["items"]
    ]
    assert "tasks.created" in first_actions and "tasks.completed" in first_actions
    assert "tasks.created" not in second_actions and "tasks.completed" not in second_actions


def test_task_advance_alerts_are_exact_and_scoped(settings, database):
    uid, token, cid, first = setup(settings, database)
    due = datetime(2030, 1, 7, 10, tzinfo=UTC)
    tid = UUID(
        task_run(settings, database, token, new(uid, cid, enquiry_id=first, due_at=due))["id"]
    )
    with database.session() as session:
        events = session.scalars(select(OutboxEvent).where(OutboxEvent.task_id == tid)).all()
    assert {event.kind: event.due_at for event in events} == {
        "task.reminder.day": due - timedelta(hours=24),
        "task.reminder.hour": due - timedelta(hours=1),
        "task.due": due,
    }
    received: set[str] = set()
    for clock, kind in (
        (due - timedelta(hours=24), "task.reminder.day"),
        (due - timedelta(hours=1), "task.reminder.hour"),
        (due, "task.due"),
    ):
        assert run_once(database, clock)
        received.add(kind)
        assert {
            item["kind"]
            for item in read_notifications(database, token, NotificationQuery())["items"]
        } == received
    assert read_notifications(database, token, NotificationQuery())["total"] == 3


def test_deal_task_result_enters_deal_not_origin_lead_history(settings, database):
    uid, token, cid, first = setup(settings, database)
    did = UUID(deal_run(settings, database, token, new_deal(cid))["id"])
    tid = UUID(task_run(settings, database, token, new(uid, cid, deal_id=did))["id"])
    visit_run(settings, database, token, booking(uid, cid, type="office", deal_id=did))
    task_run(
        settings,
        database,
        token,
        TaskAction(expected_version=1, reason="Résultat affaire synthétique"),
        tid,
        "completed",
    )
    deal_actions = [
        item["action"]
        for item in read_activities(database, token, "deals", did, ActivityQuery())["items"]
    ]
    lead_actions = [
        item["action"]
        for item in read_activities(database, token, "enquiries", first, ActivityQuery())["items"]
    ]
    assert {"tasks.created", "tasks.completed", "visits.created"} <= set(deal_actions)
    assert not {"tasks.created", "tasks.completed", "visits.created"} & set(lead_actions)


def test_visit_followup_two_hours_after_end_then_distinct_not_completed(
    settings, database, monkeypatch
):
    uid, token, cid, first = setup(settings, database)
    vid = UUID(
        visit_run(
            settings,
            database,
            token,
            booking(uid, cid, type="office", enquiry_id=first),
        )["id"]
    )
    with database.session() as session:
        events = session.scalars(select(OutboxEvent).where(OutboxEvent.visit_id == vid)).all()
    assert {event.kind for event in events} == {
        "visit.reminder.day",
        "visit.reminder.hour",
        "visit.follow_up",
    }
    end = datetime(2030, 1, 7, 11, 30, tzinfo=UTC)
    assert next(
        event.due_at for event in events if event.kind == "visit.follow_up"
    ) == end + timedelta(hours=2)
    with pytest.raises(IdentityError, match="VISIT_NOT_ENDED"):
        visit_run(
            settings,
            database,
            token,
            FinishVisit(expected_version=1, reason="Absent"),
            vid,
            "not_completed",
        )
    for _ in range(3):
        assert run_once(database, end + timedelta(hours=2))
    alerts = read_notifications(database, token, NotificationQuery())
    assert alerts["total"] == 1
    assert alerts["items"][0]["kind"] == "visit.follow_up"

    class AfterVisit(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2030, 1, 7, 14, tzinfo=UTC)

    monkeypatch.setattr("app.schedule.commands.datetime", AfterVisit)
    visit_run(
        settings,
        database,
        token,
        FinishVisit(expected_version=1, reason="Client absent, nouvelle date à convenir"),
        vid,
        "not_completed",
    )
    assert visit_detail(database, token, vid)["status"] == "not_completed"
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    actions = [
        item["action"]
        for item in read_activities(database, token, "enquiries", first, ActivityQuery())["items"]
    ]
    assert "visits.created" in actions and "visits.not_completed" in actions


def test_wrong_contact_enquiry_is_rejected(settings, database):
    uid, token, cid, _ = setup(settings, database)
    other = create_lead(settings, database, token, new_lead("+212600000002"))
    assert contact_id(other) != cid
    with pytest.raises(IdentityError, match="INVALID_WORK_CONTEXT"):
        task_run(settings, database, token, new(uid, cid, enquiry_id=UUID(other["id"])))
