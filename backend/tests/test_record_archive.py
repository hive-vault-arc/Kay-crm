"""Record-level archive preserves business history and enforces owner authority."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, select
from sqlalchemy.orm import Session

from app.archive.records import RecordLifecycle, command
from app.contacts.contracts import ListQuery
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Enquiry
from app.contacts.queries import read_detail as lead_detail
from app.contacts.queries import read_list as lead_list
from app.deals.contracts import ChildQuery, DealQuery
from app.deals.models import Deal
from app.deals.queries import read_children, read_detail, read_list
from app.identity.security import IdentityError
from app.work.contracts import TaskAction
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import edit, new, run, setup
from tests.test_ownership import change as ownership_change
from tests.test_ownership import cid, intent
from tests.test_scoped_activities import append
from tests.test_work import new as new_task
from tests.test_work import run as run_task

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def change(settings, database, token, kind, target, action, version, key=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        kind,
        target,
        action,
        RecordLifecycle(expected_version=version, reason="Décision synthétique de contrôle"),
    )


def test_lead_owner_archive_restore_replay_and_expiry(settings, database):
    owner_id, owner = actor(settings, database)
    lead = create_lead(settings, database, owner)
    eid = UUID(lead["id"])
    key = uuid4()
    before = lead_list(database, owner, "enquiries", ListQuery())
    assert before["total"] == 1

    archived = change(settings, database, owner, "enquiries", eid, "archive", 1, key)
    assert change(settings, database, owner, "enquiries", eid, "archive", 1, key) == archived
    assert archived["version"] == 2
    assert lead_list(database, owner, "enquiries", ListQuery())["total"] == 0
    assert (
        lead_list(database, owner, "enquiries", ListQuery(record_archive="archived"))["total"] == 1
    )
    detail = lead_detail(database, owner, "enquiries", eid)
    assert detail["archived_at"] and detail["assigned_agent"]["id"] == str(owner_id)
    with database.session() as session:
        events = session.scalars(
            select(TimelineEvent).where(
                TimelineEvent.enquiry_id == eid, TimelineEvent.action == "enquiries.archive"
            )
        ).all()
        assert len(events) == 1 and events[0].actor_user_id == owner_id

    restored = change(settings, database, owner, "enquiries", eid, "restore", 2)
    assert restored["version"] == 3
    assert lead_list(database, owner, "enquiries", ListQuery())["total"] == 1
    change(settings, database, owner, "enquiries", eid, "archive", 3)
    with database.session() as session, session.begin():
        row = session.get(Enquiry, eid)
        row.archived_at = datetime.now(UTC) - timedelta(days=31)
    with pytest.raises(IdentityError, match="RECORD_RESTORE_EXPIRED"):
        change(settings, database, owner, "enquiries", eid, "restore", 4)


def test_deal_archive_keeps_history_and_rechecks_owner(settings, database):
    owner_id, owner, contact_id, _ = setup(settings, database)
    deal = run(settings, database, owner, new(contact_id))
    did = UUID(deal["id"])
    outsider_id, outsider = actor(settings, database)
    assert outsider_id != owner_id
    with pytest.raises(IdentityError):
        change(settings, database, outsider, "deals", did, "archive", 1)

    archived = change(settings, database, owner, "deals", did, "archive", 1)
    assert archived["version"] == 2
    assert read_list(database, owner, DealQuery())["total"] == 0
    assert read_list(database, owner, DealQuery(record_archive="archived"))["total"] == 1
    assert read_detail(database, owner, did)["archived_at"]
    events = read_children(database, owner, did, "history", ChildQuery())["items"]
    assert events[0]["action"] == "archived"
    assert events[0]["actor"]["id"] == str(owner_id)
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        run(settings, database, owner, edit(version=2), did)
    restored = change(settings, database, owner, "deals", did, "restore", 2)
    assert restored["version"] == 3
    assert read_list(database, owner, DealQuery())["total"] == 1
    with database.session() as session:
        assert session.get(Deal, did).archived_at is None


def test_collaborator_can_read_but_cannot_archive_owner_records(settings, database):
    _, owner = actor(settings, database)
    colleague_id, colleague = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    lead = create_lead(settings, database, owner)
    eid, contact_id = UUID(lead["id"]), cid(lead)
    ownership_change(
        settings,
        database,
        manager,
        contact_id,
        intent("collaborators", collaborator_ids=[str(colleague_id)]),
    )
    did = UUID(run(settings, database, owner, new(contact_id))["id"])
    assert lead_detail(database, colleague, "enquiries", eid)["id"] == str(eid)
    assert read_detail(database, colleague, did)["id"] == str(did)
    for kind, target in (("enquiries", eid), ("deals", did)):
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            change(settings, database, colleague, kind, target, "archive", 1)
    assert change(settings, database, manager, "enquiries", eid, "archive", 1)["version"] == 2
    assert change(settings, database, manager, "deals", did, "archive", 1)["version"] == 2


def test_active_reservation_blocks_deal_archive_until_release(settings, database):
    from tests.test_reservations import fixture, reviewed

    _, owner, _, _, _, _, did = fixture(settings, database)
    run(settings, database, owner, reviewed(database, owner, did), did)
    with pytest.raises(IdentityError, match="RESERVATION_RELEASE_REQUIRED"):
        change(settings, database, owner, "deals", did, "archive", 2)
    run(settings, database, owner, reviewed(database, owner, did, "Libération synthétique"), did)
    assert change(settings, database, owner, "deals", did, "archive", 3)["version"] == 4


def test_open_task_blocks_deal_archive_and_archived_activity_is_read_only(settings, database):
    uid, owner, contact_id, _ = setup(settings, database)
    did = UUID(run(settings, database, owner, new(contact_id))["id"])
    tid = UUID(run_task(settings, database, owner, new_task(uid, contact_id, deal_id=did))["id"])
    with pytest.raises(IdentityError, match="RECORD_ACTIVE_TASK"):
        change(settings, database, owner, "deals", did, "archive", 1)
    run_task(settings, database, owner, TaskAction(expected_version=1), tid, "completed")
    assert change(settings, database, owner, "deals", did, "archive", 1)["version"] == 2
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        append(settings, database, owner, "deals", did)
    eid = UUID(create_lead(settings, database, owner, new_lead("+212600000002"))["id"])
    change(settings, database, owner, "enquiries", eid, "archive", 1)
    with pytest.raises(IdentityError, match="RECORD_ARCHIVED"):
        append(settings, database, owner, "enquiries", eid)


@pytest.mark.parametrize("committed", [False, True])
def test_interrupted_archive_retries_without_duplicate_history(settings, database, committed):
    _, owner = actor(settings, database)
    eid = UUID(create_lead(settings, database, owner)["id"])
    key = uuid4()
    hook = "after_commit" if committed else "before_commit"

    def interrupted(session):
        raise RuntimeError("SYNTHETIC_ARCHIVE_INTERRUPTION")

    event.listen(Session, hook, interrupted, once=True)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_ARCHIVE_INTERRUPTION"):
            change(settings, database, owner, "enquiries", eid, "archive", 1, key)
    finally:
        if event.contains(Session, hook, interrupted):
            event.remove(Session, hook, interrupted)
    result = change(settings, database, owner, "enquiries", eid, "archive", 1, key)
    assert result["version"] == 2
    with database.session() as session:
        assert (
            len(
                session.scalars(
                    select(TimelineEvent).where(
                        TimelineEvent.enquiry_id == eid, TimelineEvent.action == "enquiries.archive"
                    )
                ).all()
            )
            == 1
        )


def test_concurrent_archive_has_one_winner_and_invalid_reason_fails(settings, database):
    _, owner = actor(settings, database)
    eid = UUID(create_lead(settings, database, owner)["id"])
    with pytest.raises(ValidationError):
        RecordLifecycle(expected_version=1, reason="   ")

    def attempt():
        try:
            return change(settings, database, owner, "enquiries", eid, "archive", 1)
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: attempt(), range(2)))
    assert sum(isinstance(value, dict) for value in outcomes) == 1
    assert "VERSION_CONFLICT" in outcomes
    with database.session() as session:
        assert (
            len(
                session.scalars(
                    select(TimelineEvent).where(
                        TimelineEvent.enquiry_id == eid, TimelineEvent.action == "enquiries.archive"
                    )
                ).all()
            )
            == 1
        )
