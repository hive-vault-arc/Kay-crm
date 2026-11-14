"""Controlled-clock birthday delivery on the real inbox and PostgreSQL constraints."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.contacts.commands import command
from app.contacts.contracts import EditContact
from app.contacts.models import Contact
from app.files.models import Notification
from app.identity.security import IdentityError
from app.work.birthdays import BIRTHDAY_EVE, BIRTHDAY_TODAY, birthday_at, deliver_birthdays
from app.work.contracts import NotificationQuery
from app.work.notifications import mark_read, read_notifications
from tests.contact_support import actor, create_lead, new_lead
from tests.test_ownership import change, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def contact(settings, database, token, birth_date, phone="+212600000001"):
    fields = {
        "name": "Client synthétique anniversaire",
        "phones": [{"number": phone, "is_primary": True}],
        "birth_date": birth_date,
    }
    lead = create_lead(settings, database, token, new_lead(new_contact=fields))
    return UUID(lead["contact"]["id"]), fields


def inbox(database, token, **options):
    return read_notifications(database, token, NotificationQuery(), **options)


def test_birthday_stages_are_scoped_and_annual(settings, database):
    _, token = actor(settings, database)
    _, outsider = actor(settings, database)
    cid, fields = contact(settings, database, token, "1996-01-01")
    contact(settings, database, token, None, "+212600000002")
    birthday = birthday_at(date(2030, 1, 1)).astimezone(UTC)
    advance = birthday - timedelta(hours=24)
    assert deliver_birthdays(database, advance - timedelta(seconds=1)) == 0
    assert deliver_birthdays(database, advance) == 1
    assert deliver_birthdays(database, advance) == 0
    assert inbox(database, outsider)["total"] == 0
    assert inbox(database, token, birthdays=False)["unread_total"] == 0
    ahead = inbox(database, token)["items"][0]
    assert ahead["kind"] == BIRTHDAY_EVE
    assert ahead["href"] == f"/contacts/{cid}"
    assert ahead["due_local"].startswith("2030-01-01T09:00:00")
    assert "1996" not in str(ahead) and "birth_date" not in ahead
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        mark_read(database, outsider, UUID(ahead["id"]))
    assert mark_read(database, token, UUID(ahead["id"])) == {"read": True}

    assert deliver_birthdays(database, birthday - timedelta(seconds=1)) == 0
    assert deliver_birthdays(database, birthday) == 1
    assert {item["kind"] for item in inbox(database, token)["items"]} == {
        BIRTHDAY_EVE,
        BIRTHDAY_TODAY,
    }
    assert inbox(database, token)["unread_total"] == 1
    assert deliver_birthdays(database, birthday_at(date(2031, 1, 1))) == 1
    assert inbox(database, token)["total"] == 3

    command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        "contacts",
        EditContact.model_validate({**fields, "birth_date": None, "expected_version": 1}),
        cid,
    )
    assert inbox(database, token)["total"] == 0
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        mark_read(database, token, UUID(ahead["id"]))


def test_leap_birthday_moves_to_february_28_and_follows_assignment(settings, database):
    _, first = actor(settings, database)
    other, next_agent = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    cid, _ = contact(settings, database, first, "1996-02-29")
    eve = birthday_at(date(2030, 2, 28)).astimezone(UTC) - timedelta(hours=24)
    assert deliver_birthdays(database, eve) == 1
    change(settings, database, manager, cid, intent("assign", primary_agent_id=str(other)))
    assert inbox(database, first)["total"] == 0
    birthday = birthday_at(date(2030, 2, 28))
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(pool.map(lambda _: deliver_birthdays(database, birthday), range(2))) == 1
    assert inbox(database, next_agent)["items"][0]["kind"] == BIRTHDAY_TODAY
    assert inbox(database, manager)["total"] == 0
    assert deliver_birthdays(database, birthday_at(date(2030, 3, 1))) == 0
    assert deliver_birthdays(database, birthday_at(date(2032, 2, 28))) == 1
    assert deliver_birthdays(database, birthday_at(date(2032, 2, 29))) == 1
    with database.session() as session, session.begin():
        row = session.get(Contact, cid)
        assert row is not None
        row.archived_at = datetime.now(UTC)
    assert inbox(database, next_agent)["total"] == 0
    assert deliver_birthdays(database, birthday_at(date(2033, 2, 28))) == 0
    with database.session() as session:
        assert session.scalar(select(func.count(Notification.id))) == 4
