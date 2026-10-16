"""Current-scope delivery/replay, true actors, atomicity and independent waiters."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.ownership import mutate, preview
from app.files.models import Job, Notification, OutboxEvent
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.work.contracts import EditTask, NotificationQuery, TaskAction, TaskQuery
from app.work.models import Task, TaskEvent
from app.work.notifications import mark_read, read_notifications
from app.work.queries import detail, read_tasks
from app.work.worker import claim, deliver, dispatch, run_once
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import setup
from tests.identity_support import observe_two_lock_waiters
from tests.test_ownership import change, cid, confirmation, intent
from tests.test_work import CLOCK, new, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_scope_removal_hides_existing_notifications_and_prevents_pending_delivery(
    settings, database
):
    uid, token, contact, _ = setup(settings, database)
    new_uid, new_token = actor(settings, database)
    _, admin = actor(settings, database, "administrator")
    body, key = new(uid, contact), uuid4()
    saved = run(settings, database, token, body, key=key)
    tid = UUID(saved["id"])
    run_once(database, CLOCK)
    nid = UUID(read_notifications(database, token, NotificationQuery())["items"][0]["id"])
    second = run(settings, database, token, new(uid, contact, due_at=CLOCK + timedelta(minutes=1)))
    change(settings, database, admin, contact, intent("assign", primary_agent_id=new_uid))
    assert read_notifications(database, token, NotificationQuery())["total"] == 0
    for operation in (
        lambda: mark_read(database, token, nid),
        lambda: mark_read(database, new_token, nid),
        lambda: run(settings, database, token, body, key=key),
        lambda: detail(database, token, tid),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()
    assert run_once(database, CLOCK + timedelta(minutes=1))
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 1
    current = detail(database, new_token, tid)
    assert current["created_by_user_id"] == str(uid) and current["owner_eligible"] is False
    run(settings, database, new_token, TaskAction(expected_version=1), tid, "completed")
    assert detail(database, new_token, UUID(second["id"]))["owner_eligible"] is False
    with pytest.raises(IdentityError, match="INVALID_TASK_OWNER"):
        run(settings, database, new_token, new(uid, contact))


@pytest.mark.parametrize("committed", [False, True])
def test_task_interrupt_before_or_after_commit_is_atomic_and_retry_safe(
    settings, database, committed
):
    uid, token, contact, _ = setup(settings, database)
    body, key = new(uid, contact), uuid4()
    hook = "after_commit" if committed else "before_commit"

    def interrupted(session):
        raise RuntimeError("SYNTHETIC_WORK_INTERRUPTION")

    event.listen(Session, hook, interrupted, once=True)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_WORK_INTERRUPTION"):
            run(settings, database, token, body, key=key)
    finally:
        if event.contains(Session, hook, interrupted):
            event.remove(Session, hook, interrupted)
    with database.session() as session:
        for model in (Task, TaskEvent, OutboxEvent):
            assert session.scalar(select(func.count()).select_from(model)) == int(committed)
    saved = run(settings, database, token, body, key=key)
    assert run(settings, database, token, body, key=key) == saved
    with database.session() as session:
        for model in (Task, TaskEvent, OutboxEvent):
            assert session.scalar(select(func.count()).select_from(model)) == 1


def test_merge_preview_task_versions_origins_actors_and_archive_read_only(settings, database):
    uid, token, source, _ = setup(settings, database)
    survivor = cid(create_lead(settings, database, token, new_lead("+212600000002")))
    saved = run(settings, database, token, new(uid, source))
    tid = UUID(saved["id"])
    request = intent("merge", survivor_id=survivor, survivor_expected_version=1)
    confirmed = confirmation(settings, database, token, source, request)
    assert (
        preview(database, token, settings.facade_secret.get_secret_value(), source, request)[
            "impact"
        ]["task_links"]
        == 1
    )
    edit = EditTask.model_validate(
        new(uid, source).model_dump(exclude={"contact_id"})
        | dict(expected_version=1, title="Version modifiée")
    )
    run(settings, database, token, edit, tid)
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            source,
            confirmed,
            "merge",
        )
    change(settings, database, token, source, request)
    row = detail(database, token, tid)
    assert row["contact_id"] == str(survivor) and row["origin_contact_id"] == str(source)
    assert (
        row["owner_user_id"] == str(uid)
        and row["created_by_user_id"] == str(uid)
        and row["schedule_version"] == 1
    )
    _, admin = actor(settings, database, "administrator")
    change(settings, database, admin, survivor, intent("archive", version=2))
    assert detail(database, admin, tid)["contact_archived"]
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(settings, database, admin, TaskAction(expected_version=3), tid, "cancelled")


def test_concurrent_version_writers_and_waiting_authority_recheck(settings, database):
    uid, token, contact, _ = setup(settings, database)
    saved = run(settings, database, token, new(uid, contact))
    tid = UUID(saved["id"])

    def attempt():
        try:
            run(settings, database, token, TaskAction(expected_version=1), tid, "completed")
            return "ok"
        except IdentityError as failure:
            return failure.code

    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        pending = [pool.submit(attempt) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        blocker.commit()
        assert sorted(future.result(timeout=10) for future in pending) == ["VERSION_CONFLICT", "ok"]
    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        pending = [pool.submit(attempt) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        blocker.get(User, uid).state = "disabled"
        blocker.commit()
        assert [future.result(timeout=10) for future in pending] == ["UNAUTHENTICATED"] * 2


def test_invalidated_running_job_cannot_publish_with_old_fence(settings, database):
    uid, token, contact, _ = setup(settings, database)
    saved = run(settings, database, token, new(uid, contact))
    dispatch(database)
    jid, fence = claim(database, CLOCK)
    run(settings, database, token, TaskAction(expected_version=1), UUID(saved["id"]), "cancelled")
    assert not deliver(database, jid, fence, CLOCK)
    with database.session() as session:
        assert session.get(Job, jid).state == "invalidated"
        assert session.scalar(select(func.count()).select_from(Notification)) == 0


def test_raw_sql_schedule_origin_history_outbox_and_notification_guards(settings, database):
    uid, token, contact, _ = setup(settings, database)
    saved = run(settings, database, token, new(uid, contact))
    tid = UUID(saved["id"])
    for statement in (
        "UPDATE task SET schedule_version=schedule_version+1 WHERE id=:id",
        "UPDATE task SET version=version+1,title='Autre' WHERE id=:id",
        "DELETE FROM task WHERE id=:id",
        "UPDATE task_event SET action='cancelled' WHERE task_id=:id",
        "UPDATE outbox_event SET due_at=due_at+interval '1 hour' WHERE task_id=:id",
        "INSERT INTO outbox_event(id,kind,task_id,schedule_version,due_at,dedupe_key) "
        "SELECT gen_random_uuid(),kind,task_id,schedule_version,due_at,'forged' "
        "FROM outbox_event WHERE task_id=:id",
    ):
        with pytest.raises(IntegrityError), database.engine.begin() as connection:
            connection.execute(text(statement), dict(id=tid))
    assert run_once(database, CLOCK)
    with pytest.raises(IntegrityError), database.engine.begin() as connection:
        connection.execute(
            text("UPDATE notification SET user_id=:uid WHERE task_id=:id"),
            dict(uid=uuid4(), id=tid),
        )
    with pytest.raises(IntegrityError), database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO notification(id,user_id,event_key,kind,task_id,schedule_version) "
                "SELECT gen_random_uuid(),user_id,event_key,kind,task_id,schedule_version "
                "FROM notification WHERE task_id=:id"
            ),
            dict(id=tid),
        )
    nid = UUID(read_notifications(database, token, NotificationQuery())["items"][0]["id"])
    mark_read(database, token, nid)
    with pytest.raises(IntegrityError), database.engine.begin() as connection:
        connection.execute(text("UPDATE notification SET read_at=NULL WHERE id=:id"), dict(id=nid))


def test_today_uses_casablanca_midnight_not_utc_midnight(settings, database):
    uid, token, contact, _ = setup(settings, database)
    # Pinned tzdata resolves January 2026 as UTC+1; later rule changes are not assumed.
    clock = CLOCK.replace(year=2026, month=1, day=15, hour=23, minute=30)
    due = clock + timedelta(minutes=15)
    saved = run(settings, database, token, new(uid, contact, due_at=due))
    result = read_tasks(database, token, TaskQuery(bucket="today"), clock)
    assert result["today"] == "2026-01-16" and result["total"] == 1
    assert result["items"][0]["id"] == saved["id"]
    assert read_tasks(database, token, TaskQuery(bucket="overdue"), clock)["total"] == 0


@pytest.mark.parametrize("disable_recipient", [False, True])
def test_delivery_rechecks_scope_after_waiting_for_agency_lock(
    settings, database, disable_recipient
):
    uid, token, contact, _ = setup(settings, database)
    run(settings, database, token, new(uid, contact))
    dispatch(database)
    jid, fence = claim(database, CLOCK)
    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        pending = [pool.submit(deliver, database, jid, fence, CLOCK) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        if disable_recipient:
            blocker.get(User, uid).state = "disabled"
        blocker.commit()
        assert all(future.result(timeout=10) for future in pending)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == int(
            not disable_recipient
        )
