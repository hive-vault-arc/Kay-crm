"""Current authority, interruption, link preservation and policy/booking lock races."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, text
from sqlalchemy.orm import Session

from app.contacts.ownership import preview
from app.identity.models import AGENCY_ID, Agency, StaffSession, User
from app.identity.security import IdentityError
from app.schedule.contracts import EditVisit, NewVisit, PolicyEdit, PolicySave
from app.schedule.models import Visit, VisitEvent
from app.schedule.queries import detail, read_policy
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_ownership import change, cid, intent
from tests.test_schedule import booking, prepared, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_policy_restriction_racing_booking_is_serialized_and_requires_fresh_review(
    settings, database
):
    uid, token, contact, admin = prepared(settings, database)
    run(settings, database, token, booking(uid, contact))
    body = PolicyEdit(
        expected_version=2,
        company_car_capacity_per_hour=1,
        working_windows=[dict(weekday=1, start_local="09:00", end_local="18:00")],
        lunch_breaks=[dict(weekday=1, start_local="13:00", end_local="14:00")],
    )
    proposed = read_policy(database, admin, body, settings.facade_secret.get_secret_value())
    saved = PolicySave.model_validate(
        body.model_dump() | dict(preview_hash=proposed["preview_hash"])
    )
    request = booking(uid, contact, overlap_reason="SP14 chevauchement synthétique expliqué")

    def attempt(policy):
        try:
            run(settings, database, admin if policy else token, saved if policy else request)
            return "ok"
        except IdentityError as failure:
            return failure.code

    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        pending = [pool.submit(attempt, flag) for flag in (False, True)]
        observe_two_lock_waiters(database, "agency")
        blocker.commit()
        results = [future.result(timeout=10) for future in pending]
    assert results.count("ok") == 1
    assert set(results) <= {"ok", "COMPANY_CAR_CAPACITY_FULL", "SCHEDULE_REPREVIEW_REQUIRED"}


@pytest.mark.parametrize(
    "patch",
    [
        dict(start_at="2030-01-07T10:00"),
        dict(end_at="2030-01-07T10:00Z"),
        dict(start_at="2030-01-07T10:30:01Z"),
        dict(participant_ids=[]),
        dict(type="car"),
        dict(status="confirmed"),
        dict(actor_id=str(uuid4())),
        dict(expected_version=True),
    ],
)
def test_strict_visit_inputs(patch):
    with pytest.raises(ValidationError):
        NewVisit.model_validate(booking(uuid4(), uuid4()).model_dump() | patch)


@pytest.mark.parametrize("committed", [False, True])
def test_interrupted_transaction_rolls_back_or_returns_original_once(settings, database, committed):
    uid, token, contact, _ = prepared(settings, database)
    body, key = booking(uid, contact), uuid4()
    hook = "after_commit" if committed else "before_commit"

    def interrupted(session):
        raise RuntimeError("SYNTHETIC_SCHEDULE_INTERRUPTION")

    event.listen(Session, hook, interrupted, once=True)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_SCHEDULE_INTERRUPTION"):
            run(settings, database, token, body, key=key)
    finally:
        if event.contains(Session, hook, interrupted):
            event.remove(Session, hook, interrupted)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Visit)) == int(committed)
    result = run(settings, database, token, body, key=key)
    assert run(settings, database, token, body, key=key) == result
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Visit)) == 1
        assert session.scalar(select(func.count()).select_from(VisitEvent)) == 1


def test_transfer_revokes_detail_replay_and_participant_authority(settings, database):
    uid, token, contact, admin = prepared(settings, database)
    new_uid, new_token = actor(settings, database)
    body, key = booking(uid, contact), uuid4()
    result = run(settings, database, token, body, key=key)
    vid = UUID(result["id"])
    change(settings, database, admin, contact, intent("assign", primary_agent_id=new_uid))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        detail(database, token, vid)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, body, key=key)
    assert detail(database, new_token, vid)["organizer_user_id"] == str(uid)
    edit = EditVisit.model_validate(
        body.model_dump(exclude={"contact_id", "status"}) | dict(expected_version=1)
    )
    with pytest.raises(IdentityError, match="INVALID_VISIT_PARTICIPANT"):
        run(settings, database, new_token, edit, vid)
    run(settings, database, new_token, edit.model_copy(update=dict(participant_ids=[new_uid])), vid)
    history = detail(database, new_token, vid, history=True)["items"]
    assert history[-1]["actor"]["id"] == str(uid) and history[0]["actor"]["id"] == str(new_uid)
    change(settings, database, admin, contact, intent("archive", version=2))
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(settings, database, admin, edit.model_copy(update=dict(expected_version=2)), vid)


def test_merge_preserves_origin_actor_participants_and_invalidates_preview(settings, database):
    uid, token, source, _ = prepared(settings, database)
    survivor = cid(create_lead(settings, database, token, new_lead("+212600000002")))
    body = booking(uid, source, type="office")
    result = run(settings, database, token, body)
    vid = UUID(result["id"])
    request = intent("merge", survivor_id=survivor, survivor_expected_version=1)
    before = preview(database, token, settings.facade_secret.get_secret_value(), source, request)
    assert before["impact"]["visit_links"] == 1 and "visits" in before["impact"]["linked_modules"]
    change(settings, database, token, source, request)
    row = detail(database, token, vid)
    assert row["contact_id"] == str(survivor) and row["origin_contact_id"] == str(source)
    assert row["participant_ids"] == [str(uid)] and row["version"] == 2
    history = detail(database, token, vid, history=True)["items"]
    assert history[0]["action"] == "contact_merged" and history[-1]["snapshot"][
        "contact_id"
    ] == str(source)


def test_current_role_after_real_agency_lock_wait(settings, database):
    _, _, _, admin = prepared(settings, database)
    with database.session() as session:
        aid = session.scalar(
            select(StaffSession.user_id).where(StaffSession.role_at_login == "administrator")
        )
    policy = read_policy(database, admin)
    body = PolicyEdit(
        expected_version=policy["version"],
        company_car_capacity_per_hour=3,
        working_windows=[],
        lunch_breaks=[],
    )
    previewed = read_policy(database, admin, body, settings.facade_secret.get_secret_value())
    saved = PolicySave.model_validate(
        body.model_dump() | dict(preview_hash=previewed["preview_hash"])
    )

    def attempt():
        try:
            run(settings, database, admin, saved)
            return "ok"
        except IdentityError as failure:
            return failure.code

    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(1) as pool:
        blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        pending = pool.submit(attempt)
        from time import monotonic, sleep

        deadline = monotonic() + 1.5
        while monotonic() < deadline:
            with database.session() as probe:
                if probe.scalar(
                    text(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                        "AND wait_event_type='Lock' AND query LIKE '%agency%FOR UPDATE%'"
                    )
                ):
                    break
            sleep(0.01)
        else:
            raise AssertionError("REAL_POSTGRESQL_WAIT_REQUIRED")
        user = blocker.get(User, aid)
        user.role = "agent"
        user.version += 1
        blocker.commit()
        assert pending.result(timeout=10) in {"UNAUTHENTICATED", "FORBIDDEN"}
    from app.schedule.models import SchedulePolicy

    with database.session() as session:
        assert session.get(SchedulePolicy, AGENCY_ID).company_car_capacity_per_hour == 2
