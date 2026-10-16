"""AT-17: real PostgreSQL task commands and durable controlled-clock reminders."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select

from app.files.models import Job, Notification
from app.identity.security import IdentityError
from app.schedule.contracts import EditVisit, FinishVisit
from app.schedule.queries import detail as visit_detail
from app.work.commands import command
from app.work.contracts import (
    EditTask,
    NewTask,
    NotificationQuery,
    PageQuery,
    TaskAction,
    TaskQuery,
)
from app.work.notifications import mark_read, read_notifications
from app.work.queries import detail, follow_up, read_tasks
from app.work.worker import acknowledge, claim, deliver, dispatch, run_once
from tests.contact_support import actor
from tests.deal_support import setup
from tests.test_schedule import booking
from tests.test_schedule import run as visit_run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]
CLOCK = datetime(2030, 1, 7, 10, tzinfo=UTC)


def run(settings, database, token, body, tid=None, action="updated", key=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        body,
        tid,
        action,
    )


def new(uid, cid, **changes):
    return NewTask.model_validate(
        dict(
            contact_id=cid,
            title="Tâche synthétique SP15",
            notes="",
            owner_user_id=uid,
            due_at=CLOCK,
        )
        | changes
    )


def test_task_lifecycle_due_read_once_versions_and_scoped_buckets(settings, database):
    uid, token, cid, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    body, key = new(uid, cid), uuid4()
    saved = run(settings, database, token, body, key=key)
    tid = UUID(saved["id"])
    assert run(settings, database, token, body, key=key) == saved
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(settings, database, token, new(uid, cid, title="Différente"), key=key)
    assert read_tasks(database, token, TaskQuery(bucket="today"), CLOCK)["total"] == 1
    assert read_tasks(database, token, TaskQuery(bucket="overdue"), CLOCK)["total"] == 0
    assert (
        read_tasks(database, token, TaskQuery(bucket="overdue"), CLOCK + timedelta(minutes=1))[
            "total"
        ]
        == 1
    )
    assert read_tasks(database, outsider, TaskQuery(), CLOCK)["total"] == 0
    for query in (TaskQuery(contact_id=cid),):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            read_tasks(database, outsider, query, CLOCK)
    for read in (
        lambda: detail(database, outsider, tid),
        lambda: run(settings, database, outsider, TaskAction(expected_version=1), tid, "completed"),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            read()
    assert not run_once(database, CLOCK - timedelta(seconds=1))
    assert run_once(database, CLOCK)
    assert not run_once(database, CLOCK)
    inbox = read_notifications(database, token, NotificationQuery())
    assert inbox["total"] == inbox["unread_total"] == 1
    item = inbox["items"][0]
    assert item["kind"] == "task.due" and str(tid) in item["href"]
    nid = UUID(item["id"])
    assert mark_read(database, token, nid) == mark_read(database, token, nid) == {"read": True}
    assert read_notifications(database, token, NotificationQuery(state="unread"))["total"] == 0
    edit = EditTask.model_validate(
        body.model_dump(exclude={"contact_id"}) | dict(expected_version=1, title="Titre actualisé")
    )
    run(settings, database, token, edit, tid)
    assert detail(database, token, tid)["schedule_version"] == 1
    changed = edit.model_copy(update={"expected_version": 2, "due_at": CLOCK + timedelta(hours=2)})
    run(settings, database, token, changed, tid)
    assert detail(database, token, tid)["schedule_version"] == 2
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        mark_read(database, token, nid)
    assert run_once(database, CLOCK + timedelta(hours=2))
    run(
        settings,
        database,
        token,
        TaskAction(expected_version=3, reason="Travail effectué"),
        tid,
        "completed",
    )
    assert (
        read_tasks(database, token, TaskQuery(bucket="overdue"), CLOCK + timedelta(days=1))["total"]
        == 0
    )
    assert read_tasks(database, token, TaskQuery(bucket="completed"), CLOCK)["total"] == 1
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    assert detail(database, token, tid, PageQuery())["total"] == 4
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 2
    with pytest.raises(IdentityError, match="TASK_TERMINAL"):
        run(settings, database, token, TaskAction(expected_version=4), tid, "cancelled")


def test_visit_j1_h1_reschedule_cancel_complete_and_followup(settings, database):
    uid, token, cid, _ = setup(settings, database)
    saved = visit_run(settings, database, token, booking(uid, cid, type="office"))
    vid = UUID(saved["id"])
    start = datetime(2030, 1, 7, 10, 30, tzinfo=UTC)
    assert run_once(database, start - timedelta(days=1))
    assert not run_once(database, start - timedelta(days=1))
    assert run_once(database, start - timedelta(hours=1))
    assert read_notifications(database, token, NotificationQuery())["total"] == 2
    current = visit_detail(database, token, vid)
    edit = EditVisit.model_validate(
        {
            k: current[k]
            for k in (
                "title",
                "type",
                "location",
                "start_at",
                "end_at",
                "deal_id",
                "property_id",
                "participant_ids",
                "overlap_reason",
            )
        }
        | dict(expected_version=1, title="Simple correction")
    )
    visit_run(settings, database, token, edit, vid)
    assert visit_detail(database, token, vid)["schedule_version"] == 1
    rescheduled = edit.model_copy(
        update={
            "expected_version": 2,
            "start_at": start + timedelta(days=2),
            "end_at": start + timedelta(days=2, hours=1),
        }
    )
    visit_run(settings, database, token, rescheduled, vid, "rescheduled")
    assert visit_detail(database, token, vid)["schedule_version"] == 2
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    assert run_once(database, start + timedelta(days=1))
    visit_run(
        settings,
        database,
        token,
        FinishVisit(expected_version=3, reason="Annulation synthétique"),
        vid,
        "cancelled",
    )
    assert not run_once(database, start + timedelta(days=2))
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    another = visit_run(settings, database, token, booking(uid, cid, type="office"))
    assert follow_up(database, token, PageQuery(), start + timedelta(hours=2))["total"] == 1
    visit_run(
        settings,
        database,
        token,
        FinishVisit(expected_version=1, reason="Résultat consigné"),
        UUID(another["id"]),
        "completed",
    )
    assert follow_up(database, token, PageQuery(), start + timedelta(hours=2))["total"] == 0


def test_crash_after_effect_before_ack_expiry_fence_and_unique_notification(settings, database):
    uid, token, cid, _ = setup(settings, database)
    run(settings, database, token, new(uid, cid))
    dispatch(database)
    jid, old = claim(database, CLOCK)
    assert deliver(database, jid, old, CLOCK)
    assert claim(database, CLOCK) is None
    later = CLOCK + timedelta(seconds=91)
    jid2, fresh = claim(database, later)
    assert jid == jid2 and fresh != old
    assert not deliver(database, jid, old, later)
    assert not acknowledge(database, jid, old, later)
    assert deliver(database, jid, fresh, later)
    assert acknowledge(database, jid, fresh, later)
    assert not run_once(database, later)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 1
        assert session.get(Job, jid).attempts == 2


def test_concurrent_workers_take_a_due_event_once_and_backoff_is_bounded(settings, database):
    uid, token, cid, _ = setup(settings, database)
    run(settings, database, token, new(uid, cid))
    dispatch(database)
    starting = Barrier(2)
    connections = set()

    def synchronize_claim(connection, cursor, statement, parameters, context, executemany):
        if "FOR UPDATE SKIP LOCKED" in statement and "job.attempts <" in statement:
            connections.add(id(connection.connection.driver_connection))
            starting.wait(timeout=5)

    event.listen(database.engine, "before_cursor_execute", synchronize_claim)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            claims = list(pool.map(lambda _: claim(database, CLOCK), range(2)))
    finally:
        event.remove(database.engine, "before_cursor_execute", synchronize_claim)
    assert len(connections) == 2
    assert sum(value is not None for value in claims) == 1
    jid, fence = next(value for value in claims if value)
    assert acknowledge(database, jid, fence, CLOCK, error="WORKER_DELIVERY_FAILED")
    assert claim(database, CLOCK + timedelta(seconds=1)) is None
    clock = CLOCK + timedelta(seconds=2)
    for attempt in range(2, 6):
        _, fence = claim(database, clock)
        assert acknowledge(database, jid, fence, clock, error="WORKER_DELIVERY_FAILED")
        clock += timedelta(seconds=2**attempt)
    assert claim(database, clock) is None
    with database.session() as session:
        row = session.get(Job, jid)
        assert row.state == "failed" and row.attempts == 5 and row.lease_token is None


@pytest.mark.parametrize(
    "changes",
    [
        {"due_at": "2030-01-07T10:00"},
        {"due_at": "2030-01-07T10:00:01Z"},
        {"title": " "},
        {"status": "completed"},
        {"schedule_version": 99},
    ],
)
def test_strict_task_input(changes):
    with pytest.raises(ValidationError):
        new(uuid4(), uuid4(), **changes)
