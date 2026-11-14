"""Disposable PostgreSQL tests for holiday sync, authorization and delivery."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from threading import Event
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, text, update
from sqlalchemy.exc import IntegrityError

from app.files.models import Notification
from app.identity.models import StaffSession, User
from app.identity.security import IdentityError
from app.realtime.models import PushDelivery, PushSubscription
from app.realtime.push import run_once as run_push
from app.recovery.maintenance import Admission
from app.schedule.rules import ZONE
from app.work.birthdays import BIRTHDAY_EVE, deliver_birthdays
from app.work.contracts import NotificationQuery
from app.work.holiday_models import HolidayConfirmation, HolidayOccurrence, HolidaySync
from app.work.holiday_sources import Holiday, UnsupportedYear, normalize
from app.work.holiday_sync import sync_due
from app.work.holidays import (
    EVE,
    TODAY,
    ConfirmHoliday,
    confirm_holiday,
    deliver_holidays,
    holiday_at,
    settings_view,
)
from app.work.notifications import mark_read, read_notifications
from app.work.worker import run_once as run_work
from tests.contact_support import actor
from tests.test_contact_birthdays import contact
from tests.test_isolation_migrations import migrate
from tests.test_schedule import booking
from tests.test_schedule import run as visit_run
from tests.test_work import new as new_task
from tests.test_work import run as task_run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]
OFFICIAL = "https://www.habous.gov.ma/fr/communique-synthetique"


def value(day, status="estimated", code="eid-al-fitr", *, days=2):
    return Holiday(
        code,
        "Aïd synthétique",
        "national" if status == "fixed" else "religious",
        status,
        day,
        day + timedelta(days=days - 1) if day else None,
        OFFICIAL,
    )


def seed(database, year, holiday):
    with database.session() as session, session.begin():
        row = HolidayOccurrence(
            year=year,
            code=holiday.code,
            name=holiday.name,
            category=holiday.category,
            status=holiday.status,
            start_on=holiday.start_on,
            end_on=holiday.end_on,
            source_url=holiday.source_url,
        )
        session.add(row)
        session.flush()
        return row.id


def inbox(database, token, **options):
    return read_notifications(
        database, token, NotificationQuery(), **({"holidays": True} | options)
    )


def confirmation(day, version=1):
    return ConfirmHoliday.model_validate(
        {
            "expected_version": version,
            "start_on": day.isoformat(),
            "end_on": (day + timedelta(days=1)).isoformat(),
            "source_url": OFFICIAL,
        }
    )


def test_fixed_new_year_concurrent_delivery_and_staff_authority(settings, database):
    _, agent = actor(settings, database)
    _, admin = actor(settings, database, "administrator")
    _, manager = actor(settings, database, "manager")
    disabled, _ = actor(settings, database)
    deleted, _ = actor(settings, database)
    with database.session() as session, session.begin():
        session.get(User, disabled).state = "disabled"
        session.get(User, deleted).state = "disabled"
        session.get(User, deleted).deleted_at = datetime.now(UTC)
    day = date(2027, 1, 1)
    seed(database, 2027, value(day, "fixed", "new-year", days=1))
    due = holiday_at(day).astimezone(UTC)
    eve = due - timedelta(hours=24)
    assert eve.astimezone(ZONE).date() == date(2026, 12, 31)
    assert deliver_holidays(database, eve - timedelta(seconds=1)) == 0
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(lambda _: deliver_holidays(database, eve), range(2))) == 3
    assert deliver_holidays(database, eve) == 0
    assert inbox(database, manager)["unread_total"] == 1
    assert inbox(database, agent, holidays=False)["total"] == 0
    notice = inbox(database, agent)["items"][0]
    assert notice["kind"] == EVE and not notice["estimated"]
    notice_id = UUID(notice["id"])
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        mark_read(database, admin, notice_id, holidays=True)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        mark_read(database, agent, notice_id)
    assert mark_read(database, agent, notice_id, holidays=True) == {"read": True}
    assert deliver_holidays(database, due) == 3
    assert inbox(database, agent)["unread_total"] == 1
    with database.session() as session:
        assert (
            session.scalars(
                select(Notification).where(Notification.user_id.in_([disabled, deleted]))
            ).all()
            == []
        )


def test_aid_correction_reopens_original_once_and_same_date_confirmation_keeps_read(
    settings, database
):
    _, admin = actor(settings, database, "administrator")
    _, agent = actor(settings, database)
    day = date(2027, 3, 10)
    original = value(day)
    hid = seed(database, day.year, original)
    at = holiday_at(day).astimezone(UTC)
    assert deliver_holidays(database, at - timedelta(hours=24)) == 2
    notice = inbox(database, agent)["items"][0]
    assert (
        notice["estimated"]
        and notice["start_on"] == "2027-03-10"
        and notice["end_on"] == "2027-03-11"
    )
    mark_read(database, agent, UUID(notice["id"]), holidays=True)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        confirm_holiday(database, agent, hid, uuid4(), confirmation(day), at)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        settings_view(database, agent, True, at)
    already_read = inbox(database, agent)["items"][0]["read_at"]
    key = uuid4()
    assert confirm_holiday(database, admin, hid, key, confirmation(day), at)["version"] == 2
    same = inbox(database, agent)["items"][0]
    assert not same["estimated"] and not same["corrected"] and same["read_at"] == already_read
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        confirm_holiday(database, admin, hid, uuid4(), confirmation(day), at)
    corrected = day + timedelta(days=1)
    correction_key = uuid4()
    for _ in range(2):
        confirm_holiday(database, admin, hid, correction_key, confirmation(corrected, 2), at)
    revised = inbox(database, agent)["items"][0]
    assert revised["id"] == notice["id"] and revised["corrected"] and revised["read_at"] is None
    assert revised["end_on"] == "2027-03-12"
    mark_read(database, agent, UUID(notice["id"]), holidays=True)
    assert deliver_holidays(database, at) == 0
    confirm_holiday(database, admin, hid, correction_key, confirmation(corrected, 2), at)
    assert inbox(database, agent)["unread_total"] == 0
    with (
        pytest.raises(IntegrityError, match="NOTIFICATION_IMMUTABLE"),
        database.session() as session,
        session.begin(),
    ):
        session.execute(
            update(Notification)
            .where(Notification.id == UUID(notice["id"]))
            .values(read_at=None, holiday_revision=3)
        )
    assert deliver_holidays(database, holiday_at(corrected)) == 2
    assert deliver_holidays(database, holiday_at(corrected + timedelta(days=1))) == 0
    with database.session() as session:
        assert len(session.scalars(select(HolidayConfirmation)).all()) == 2


def test_clock_change_and_late_confirmation(settings, database):
    _, agent = actor(settings, database)
    _, admin = actor(settings, database, "administrator")
    first = date(2026, 2, 15)
    due = holiday_at(first).astimezone(UTC)
    eve = due - timedelta(hours=24)
    assert eve.astimezone(ZONE).hour != 9
    hid = seed(database, first.year, value(first))
    assert deliver_holidays(database, eve - timedelta(seconds=1)) == 0
    assert deliver_holidays(database, eve) == 2
    assert deliver_holidays(database, due) == 0
    late = due + timedelta(hours=10)
    confirm_holiday(database, admin, hid, uuid4(), confirmation(first), late)
    assert deliver_holidays(database, late) == 2
    assert {row["kind"] for row in inbox(database, agent)["items"]} == {EVE, TODAY}
    next_day = first + timedelta(days=5)
    second = seed(database, first.year, value(next_day, code="mawlid"))
    too_late = holiday_at(next_day + timedelta(days=1))
    confirm_holiday(database, admin, second, uuid4(), confirmation(next_day), too_late)
    assert deliver_holidays(database, too_late) == 0


def test_independent_sync_keeps_last_good_and_manual_dates(settings, database):
    _, admin = actor(settings, database, "administrator")
    day = date(2027, 3, 10)
    first_sync = datetime(2027, 1, 2, 12, tzinfo=UTC)
    admission = Admission(settings)
    calls = []

    def first(provider, year):
        calls.append((provider, year))
        if year == 2028 and provider == "moroccoapi":
            raise UnsupportedYear
        if provider == "agenda":
            return [value(day.replace(year=year))]
        return [value(day, "fixed", "test-fixed", days=1), value(None, "pending")]

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: sync_due(database, admission, lambda: first_sync, first), range(2)))
    assert len(calls) == len(set(calls)) == 4
    view = settings_view(database, admin, True, first_sync)
    estimated = next(
        row for row in view["items"] if row["year"] == 2027 and row["status"] == "estimated"
    )
    hid = UUID(estimated["id"])
    confirm_holiday(
        database, admin, hid, uuid4(), confirmation(day, estimated["version"]), first_sync
    )

    def second(provider, year):
        if year == 2027 and provider == "moroccoapi":
            return [value(day + timedelta(days=1), "confirmed")]
        if provider == "moroccoapi":
            raise OSError
        raise ValueError

    sync_due(database, admission, lambda: first_sync + timedelta(days=1), second)
    with database.session() as session:
        assert session.get(HolidayOccurrence, hid).status == "manual"
        assert session.get(HolidayOccurrence, hid).start_on == day
        assert len(session.scalars(select(HolidayOccurrence)).all()) == 3
        state = session.get(HolidaySync, ("agenda", 2027))
        assert state.succeeded_at == first_sync and state.error_code == "INVALID_FEED"
        assert session.get(HolidaySync, ("moroccoapi", 2028)).succeeded_at is None
        assert session.get(HolidaySync, ("moroccoapi", 2028)).error_code == "FEED_UNAVAILABLE"


def test_stalled_network_releases_admission_and_allows_birthday_delivery(settings, database):
    agent_id, agent = actor(settings, database)
    cid, _ = contact(settings, database, agent, "1995-01-07")
    due = holiday_at(date(2030, 1, 7)).astimezone(UTC)
    task_run(settings, database, agent, new_task(agent_id, cid, due_at=due))
    visit_run(settings, database, agent, booking(agent_id, cid, type="office"))
    now = due - timedelta(hours=1)
    entered, release = Event(), Event()
    admission = Admission(settings)

    def blocked(_provider, _year):
        entered.set()
        assert release.wait(8)
        raise TimeoutError

    with ThreadPoolExecutor(max_workers=1) as pool:
        run = pool.submit(sync_due, database, admission, lambda: now, blocked)
        try:
            assert entered.wait(5)
            assert admission.users == 0
            assert deliver_birthdays(database, due - timedelta(hours=24)) == 1
            work_clock = due - timedelta(hours=1)
            for _ in range(5):
                if not run_work(database, work_clock):
                    break
            kinds = {item["kind"] for item in inbox(database, agent)["items"]}
            assert {BIRTHDAY_EVE, "task.reminder.day", "visit.reminder.day"} <= kinds
        finally:
            release.set()
        run.result(timeout=10)


def test_two_day_feed_validation_and_sourced_religious_confirmation():
    basic = {
        "id": "eid-al-fitr",
        "type": "religious",
        "status": "confirmed",
        "names": {"fr": "Aïd al-Fitr"},
    }
    rows = [
        {**basic, "day": i, "date": f"2027-03-{9 + i:02d}", "source_urls": [OFFICIAL]}
        for i in (1, 2)
    ]
    payload = {"meta": {"years": [2027]}, "data": rows}
    (aid,) = normalize("moroccoapi", 2027, payload)
    assert (aid.start_on, aid.end_on, aid.status) == (
        date(2027, 3, 10),
        date(2027, 3, 11),
        "confirmed",
    )
    rows[1]["date"] = "2027-03-14"
    with pytest.raises(ValueError, match="SPAN"):
        normalize("moroccoapi", 2027, payload)
    for row in rows:
        row["source_urls"] = ["https://example.invalid/not-official"]
    assert normalize("moroccoapi", 2027, payload)[0].status == "pending"
    with pytest.raises(ValueError):
        ConfirmHoliday.model_validate(
            {
                "expected_version": 1,
                "start_on": "2027-03-10",
                "end_on": "2027-03-11",
                "source_url": "https://www.habous.gov.ma@example.invalid/notice",
            }
        )


def test_holiday_never_enters_web_push_queue(settings, database, monkeypatch):
    uid, token = actor(settings, database)
    now = datetime.now(UTC)
    tomorrow = now.astimezone(ZONE).date() + timedelta(days=1)
    hid = seed(database, tomorrow.year, value(tomorrow))
    with database.session() as session, session.begin():
        sid = session.scalar(select(StaffSession.id).where(StaffSession.user_id == uid))
        session.add(
            PushSubscription(
                session_id=sid,
                endpoint="https://fcm.googleapis.com/test",
                p256dh="synthetic",
                auth="synthetic",
                active=True,
                created_at=now - timedelta(minutes=10),
            )
        )
        session.add(
            Notification(
                user_id=uid,
                event_key=f"{EVE}:{hid}",
                kind=EVE,
                holiday_id=hid,
                created_at=now - timedelta(minutes=2),
            )
        )
    assert inbox(database, token)["unread_total"] == 1

    def forbid(*_):
        pytest.fail("Holiday notification reached external transport")

    monkeypatch.setattr("app.realtime.push.send", forbid)
    assert not run_push(database, settings.model_copy(update={"web_push_enabled": True}))
    with database.session() as session:
        assert session.scalar(select(PushDelivery)) is None


def test_0049_preserves_populated_inbox(settings, database):
    _, agent = actor(settings, database)
    contact(settings, database, agent, "1995-05-19")
    day = holiday_at(date(2027, 5, 19))
    deliver_birthdays(database, day - timedelta(hours=24))
    deliver_birthdays(database, day)
    mark_read(database, agent, UUID(inbox(database, agent)["items"][0]["id"]))
    original = inbox(database, agent)
    assert original["total"] == 2 and original["unread_total"] == 1
    assert migrate("downgrade", "0048_contact_birthday_alerts").returncode == 0
    try:
        with database.engine.connect() as connection:
            assert connection.scalar(text("SELECT count(*) FROM notification")) == 2
            assert (
                connection.scalar(text("SELECT count(*) FROM notification WHERE read_at IS NULL"))
                == 1
            )
    finally:
        assert migrate("upgrade", "head").returncode == 0
    assert migrate("check").returncode == 0
    assert original == inbox(database, agent)
