"""AT-16/40: actual PostgreSQL policy, privacy, clock boundaries and booking races."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.identity.models import AGENCY_ID, Agency
from app.identity.security import IdentityError
from app.schedule.commands import command
from app.schedule.contracts import (
    AvailabilityQuery,
    CalendarQuery,
    EditVisit,
    FinishVisit,
    NewVisit,
    PolicyEdit,
    PolicySave,
    VisitAction,
)
from app.schedule.local_time import resolve_local
from app.schedule.models import Visit, VisitEvent
from app.schedule.queries import availability, detail, read_policy, read_visits
from tests.contact_support import actor, create_lead
from tests.deal_support import setup
from tests.identity_support import observe_two_lock_waiters

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def run(settings, database, token, body, vid=None, action="updated", key=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        body,
        vid,
        action,
    )


def policy(settings, database, token, version=1, capacity=2, **changes):
    body = PolicyEdit.model_validate(
        dict(
            expected_version=version,
            company_car_capacity_per_hour=capacity,
            working_windows=[dict(weekday=1, start_local="09:00", end_local="18:00")],
            lunch_breaks=[dict(weekday=1, start_local="13:00", end_local="14:00")],
        )
        | changes
    )
    preview = read_policy(database, token, body, settings.facade_secret.get_secret_value())
    saved = PolicySave.model_validate(
        body.model_dump() | dict(preview_hash=preview["preview_hash"])
    )
    return run(settings, database, token, saved), saved


def booking(uid, cid, **changes):
    return NewVisit.model_validate(
        dict(
            contact_id=cid,
            title="Visite synthétique SP14",
            type="company_car",
            start_at="2030-01-07T10:30:00+00:00",
            end_at="2030-01-07T11:30:00+00:00",
            location="Lieu synthétique",
            participant_ids=[uid],
        )
        | changes
    )


def prepared(settings, database):
    uid, token, cid, _ = setup(settings, database)
    _, admin = actor(settings, database, "administrator")
    policy(settings, database, admin)
    return uid, token, cid, admin


def test_no_schedule_office_allowed_draft_no_guarantee_and_confirmation(settings, database):
    uid, token, cid, _ = setup(settings, database)
    with pytest.raises(IdentityError, match="VISIT_SCHEDULE_NOT_CONFIGURED"):
        run(settings, database, token, booking(uid, cid))
    draft = run(settings, database, token, booking(uid, cid, status="draft"))
    with pytest.raises(IdentityError, match="VISIT_SCHEDULE_NOT_CONFIGURED"):
        run(
            settings,
            database,
            token,
            VisitAction(expected_version=1),
            UUID(draft["id"]),
            "confirmed",
        )
    office = run(
        settings,
        database,
        token,
        booking(uid, cid, type="office", start_at="2030-01-06T02:00Z", end_at="2030-01-06T03:00Z"),
    )
    assert detail(database, token, UUID(office["id"]))["status"] == "scheduled"
    assert detail(database, token, UUID(draft["id"]))["status"] == "draft"


@pytest.mark.parametrize("kind", ["company_car", "without_company_car"])
@pytest.mark.parametrize(
    "start,end,code",
    [
        ("08:30", "09:30", "VISIT_OUTSIDE_WORKING_HOURS"),
        ("12:30", "13:30", "VISIT_LUNCH_BREAK"),
        ("17:30", "18:30", "VISIT_OUTSIDE_WORKING_HOURS"),
    ],
)
def test_offsite_hard_rules_cannot_be_overridden(settings, database, kind, start, end, code):
    uid, token, cid, _ = prepared(settings, database)
    fields = dict(
        start_at=f"2030-01-07T{start}Z",
        end_at=f"2030-01-07T{end}Z",
        overlap_reason="Ne doit pas contourner la règle",
    )
    with pytest.raises(IdentityError, match=code):
        run(settings, database, token, booking(uid, cid, type=kind, **fields))
    assert (
        run(settings, database, token, booking(uid, cid, type="office", **fields))["version"] == 1
    )


def test_hour_intersection_exact_end_capacity_and_without_car(settings, database):
    uid, token, cid, admin = prepared(settings, database)
    policy(settings, database, admin, version=2, capacity=1)
    result = run(settings, database, token, booking(uid, cid))
    preview = availability(
        database,
        token,
        AvailabilityQuery(
            type="company_car", start_at="2030-01-07T10:00Z", end_at="2030-01-07T12:00Z"
        ),
    )
    assert [slot["used"] for slot in preview["company_car_intervals"]] == [1, 1]
    assert not preview["bookable"]
    with pytest.raises(IdentityError, match="COMPANY_CAR_CAPACITY_FULL"):
        run(settings, database, token, booking(uid, cid, overlap_reason="Conflit expliqué"))
    run(
        settings,
        database,
        token,
        booking(uid, cid, type="without_company_car", overlap_reason="Conflit expliqué"),
    )
    run(
        settings,
        database,
        token,
        FinishVisit(expected_version=1, reason="Terminée synthétiquement"),
        UUID(result["id"]),
        "completed",
    )
    run(
        settings,
        database,
        token,
        booking(
            uid,
            cid,
            start_at="2030-01-07T10:00Z",
            end_at="2030-01-07T11:00Z",
            overlap_reason="Conflit expliqué",
        ),
    )
    preview = availability(
        database,
        token,
        AvailabilityQuery(
            type="company_car", start_at="2030-01-07T11:00Z", end_at="2030-01-07T12:00Z"
        ),
    )
    assert preview["bookable"] and preview["company_car_intervals"][0]["used"] == 0


def test_overlap_reason_versions_reschedule_retry_and_history(settings, database):
    uid, token, cid, _ = prepared(settings, database)
    first = run(settings, database, token, booking(uid, cid, type="office"))
    body = booking(uid, cid, type="without_company_car")
    with pytest.raises(IdentityError, match="VISIT_OVERLAP_REASON_REQUIRED"):
        run(settings, database, token, body)
    body = body.model_copy(update=dict(overlap_reason="Accompagnement partagé, synthétique"))
    key = uuid4()
    second = run(settings, database, token, body, key=key)
    assert run(settings, database, token, body, key=key) == second
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(settings, database, token, body.model_copy(update=dict(title="Autre titre")), key=key)
    vid = UUID(second["id"])
    edited = EditVisit.model_validate(
        body.model_dump(exclude={"contact_id", "status"})
        | dict(
            expected_version=1,
            start_at="2030-01-07T15:00Z",
            end_at="2030-01-07T16:00Z",
            overlap_reason="",
        )
    )
    run(settings, database, token, edited, vid, "rescheduled")
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        run(settings, database, token, edited, vid, "rescheduled")
    run(settings, database, token, VisitAction(expected_version=2), vid, "confirmed")
    run(
        settings,
        database,
        token,
        FinishVisit(expected_version=3, reason="Annulation synthétique"),
        vid,
        "cancelled",
    )
    assert [e["action"] for e in detail(database, token, vid, history=True)["items"]] == [
        "cancelled",
        "confirmed",
        "rescheduled",
        "created",
    ]
    assert detail(database, token, UUID(first["id"]))["version"] == 1
    finished = detail(database, token, vid)
    assert finished["outcome"] == "Annulation synthétique"
    assert finished["overlap_reason"] == ""
    with pytest.raises(IdentityError, match="VISIT_TERMINAL"):
        run(settings, database, token, VisitAction(expected_version=4), vid, "confirmed")


def test_policy_preview_preserves_future_visits_and_rechecks_new_booking(settings, database):
    uid, token, cid, admin = prepared(settings, database)
    visit = run(settings, database, token, booking(uid, cid))
    body = PolicyEdit(
        expected_version=2, company_car_capacity_per_hour=1, working_windows=[], lunch_breaks=[]
    )
    impact = read_policy(database, admin, body, settings.facade_secret.get_secret_value())
    assert impact["affected_total"] == 1
    assert read_policy(database, token)["version"] == 2
    saved = PolicySave.model_validate(body.model_dump() | dict(preview_hash=impact["preview_hash"]))
    run(
        settings,
        database,
        token,
        booking(uid, cid, type="office", start_at="2030-01-07T15:00Z", end_at="2030-01-07T16:00Z"),
    )
    with pytest.raises(IdentityError, match="SCHEDULE_REPREVIEW_REQUIRED"):
        run(settings, database, admin, saved)
    impact = read_policy(database, admin, body, settings.facade_secret.get_secret_value())
    run(
        settings,
        database,
        admin,
        PolicySave.model_validate(body.model_dump() | dict(preview_hash=impact["preview_hash"])),
    )
    actual = detail(database, token, UUID(visit["id"]))
    assert actual["status"] == "scheduled" and actual["version"] == 1
    assert actual["review_code"] == "VISIT_SCHEDULE_NOT_CONFIGURED"


@pytest.mark.parametrize("role", ["manager", "agent"])
def test_admin_only_policy_scope_and_free_busy_privacy(settings, database, role):
    uid, token, cid, admin = prepared(settings, database)
    row = run(settings, database, token, booking(uid, cid))
    _, outsider = actor(settings, database, role)
    _, saved = policy(settings, database, admin, version=2)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        run(settings, database, outsider, saved)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_policy(
            database,
            outsider,
            PolicyEdit.model_validate(saved.model_dump(exclude={"preview_hash"})),
            settings.facade_secret.get_secret_value(),
        )
    query = CalendarQuery(start_at="2030-01-07T00:00Z", end_at="2030-01-08T00:00Z")
    busy = read_visits(database, outsider, query, busy=True)
    assert busy["total"] == 1 and set(busy["items"][0]) == {"start_at", "end_at", "busy"}
    if role == "agent":
        assert read_visits(database, outsider, query)["total"] == 0
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            detail(database, outsider, UUID(row["id"]))
    else:
        assert read_visits(database, outsider, query)["total"] == 1


def test_two_synchronized_last_slot_claims_one_wins(settings, database):
    uid, token, cid, _ = prepared(settings, database)
    run(settings, database, token, booking(uid, cid))
    contenders = []
    for phone in ("+212600000002", "+212600000003"):
        user, proof = actor(settings, database)
        from tests.contact_support import new_lead

        lead = create_lead(settings, database, proof, new_lead(phone))
        from tests.test_ownership import cid as contact_id

        contenders.append((proof, booking(user, contact_id(lead))))

    def claim(item):
        try:
            run(settings, database, item[0], item[1])
            return "ok"
        except IdentityError as error:
            return error.code

    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        with ThreadPoolExecutor(2) as pool:
            futures = [pool.submit(claim, item) for item in contenders]
            observe_two_lock_waiters(database, "agency")
            session.commit()
            assert sorted(f.result() for f in futures) == ["COMPANY_CAR_CAPACITY_FULL", "ok"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Visit)) == 2


def test_casablanca_repeated_skipped_local_times_and_real_hour_identity(settings, database):
    repeated = resolve_local("2026-02-15T02:30")["choices"]
    assert len(repeated) == 2 and repeated[0]["instant"] != repeated[1]["instant"]
    assert resolve_local("2026-03-22T02:30")["choices"] == []
    # Future civil time uses current backend tzdata, not Node/old PostgreSQL data.
    assert resolve_local("2026-10-15T10:00")["choices"][0]["instant"] == "2026-10-15T10:00:00+00:00"
    uid, token, cid, admin = prepared(settings, database)
    policy(
        settings,
        database,
        admin,
        version=2,
        capacity=1,
        working_windows=[dict(weekday=7, start_local="01:00", end_local="05:00")],
        lunch_breaks=[],
    )
    for choice in repeated:
        start = datetime.fromisoformat(choice["instant"])
        from datetime import timedelta

        run(
            settings,
            database,
            token,
            booking(uid, cid, start_at=start, end_at=start + timedelta(minutes=15)),
        )
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Visit)) == 2
    run(
        settings,
        database,
        token,
        booking(uid, cid, start_at="2026-03-22T01:30Z", end_at="2026-03-22T02:30Z"),
    )
    skipped = availability(
        database,
        token,
        AvailabilityQuery(
            type="company_car", start_at="2026-03-22T01:30Z", end_at="2026-03-22T02:30Z"
        ),
    )
    assert [slot["local_label"][11:13] for slot in skipped["company_car_intervals"]] == ["01", "03"]
    assert [slot["used"] for slot in skipped["company_car_intervals"]] == [1, 1]


def test_window_validation_and_sql_history_guards(settings, database):
    uid, token, cid, _ = prepared(settings, database)
    for patch in (
        dict(company_car_capacity_per_hour=0),
        dict(working_windows=[dict(weekday=1, start_local="18:00", end_local="09:00")]),
        dict(lunch_breaks=[dict(weekday=2, start_local="12:00", end_local="13:00")]),
    ):
        with pytest.raises(ValidationError):
            PolicyEdit.model_validate(
                dict(
                    expected_version=1,
                    company_car_capacity_per_hour=2,
                    working_windows=[],
                    lunch_breaks=[],
                )
                | patch
            )
    row = run(settings, database, token, booking(uid, cid))
    for sql in (
        "UPDATE visit_event SET reason='changed'",
        "DELETE FROM visit_participant",
        "UPDATE visit SET version=version+1,title='changed'",
    ):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(text(sql))
    assert detail(database, token, UUID(row["id"]))["version"] == 1
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(VisitEvent)) == 1
