"""Prepared real isolated PostgreSQL coverage; not selected by the unit runner."""

import csv
import io
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import update

from app.archive.records import RecordLifecycle
from app.archive.records import command as archive_record
from app.contacts.contracts import ListQuery
from app.contacts.models import Contact, ContactCollaborator
from app.contacts.queries import assignment_options, read_list, responsible_options
from app.discovery.contracts import NewExport
from app.discovery.csv_export import generate
from app.discovery.exports import request_export
from app.identity.models import User
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new, run
from tests.test_lead_conversion import conversion

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def listing(database, token, **values):
    return read_list(database, token, "contacts", ListQuery(**values), directory_enabled=True)


def test_link_counts_and_filters_match_active_lists_after_conversion_and_archive(
    settings, database
):
    uid, token = actor(settings, database)
    _, private = actor(settings, database)
    lead = create_lead(settings, database, token)
    cid, eid = UUID(lead["contact"]["id"]), UUID(lead["id"])
    second = create_lead(settings, database, token, new_lead(new_contact=None, contact_id=cid))
    create_lead(settings, database, private, new_lead("+212600000002"))
    run(settings, database, token, new(cid))
    run(settings, database, token, conversion(), eid)
    result = listing(database, token, primary_agent_id=uid, linked="enquiries", role="owner")
    assert result["total"] == 1
    assert result["items"][0]["dossier_counts"] == {"enquiries": 1, "deals": 2}
    archive_record(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        "enquiries",
        UUID(second["id"]),
        "archive",
        RecordLifecycle(expected_version=second["version"], reason="Archivage synthétique"),
    )
    assert listing(database, token, linked="enquiries")["total"] == 0
    assert listing(database, token, linked="deals")["total"] == 1
    assert listing(database, token, linked="none")["total"] == 0
    deep = listing(database, token, page=8, page_size=1)
    assert deep["items"] == [] and deep["total"] == 1


def test_current_scope_revocation_changes_counts_filters_and_responsible_choices(
    settings, database
):
    uid, token = actor(settings, database)
    other_id, other = actor(settings, database)
    private = create_lead(settings, database, other)
    cid = UUID(private["contact"]["id"])
    assert listing(database, token, primary_agent_id=other_id)["total"] == 0
    assert responsible_options(database, token, ListQuery())["total"] == 0
    with database.session() as session, session.begin():
        session.add(ContactCollaborator(contact_id=cid, user_id=uid))
    assert (
        listing(database, token, linked="enquiries")["items"][0]["dossier_counts"]["enquiries"] == 1
    )
    assert responsible_options(database, token, ListQuery())["items"][0]["id"] == str(other_id)
    with database.session() as session, session.begin():
        session.execute(
            update(ContactCollaborator)
            .where(ContactCollaborator.contact_id == cid, ContactCollaborator.user_id == uid)
            .values(revoked_at=datetime.now(UTC))
        )
    assert listing(database, token, linked="enquiries")["total"] == 0
    assert responsible_options(database, token, ListQuery())["total"] == 0


def test_created_civil_day_and_saved_export_filters_use_same_whole_result(settings, database):
    uid, token = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    first = create_lead(settings, database, token)
    create_lead(settings, database, token, new_lead("+212600000002"))
    cid = UUID(first["contact"]["id"])
    with database.session() as session, session.begin():
        session.execute(
            update(Contact)
            .where(Contact.id == cid)
            .values(created_at=datetime(2026, 1, 1, 23, 30, tzinfo=UTC))
        )
    filters = {
        "primary_agent_id": uid,
        "created_from": "2026-01-02",
        "created_to": "2026-01-02",
        "role": "owner",
        "linked": "enquiries",
        "sort": "-created_at",
    }
    result = listing(database, manager, **filters)
    assert result["total"] == 1 and result["items"][0]["id"] == str(cid)
    key, body = uuid4(), NewExport(kind="contacts", filters=filters)
    job = request_export(database, manager, key, body)
    assert request_export(database, manager, key, body) == job
    content, count = generate(database, UUID(job["id"]))
    rows = list(csv.DictReader(io.StringIO(content.decode("utf-8-sig"))))
    assert count == len(rows) == 1 and rows[0]["contact_id"] == str(cid)


def test_filter_responsibility_retains_disabled_owners_without_granting_assignment(
    settings, database
):
    uid, token = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    create_lead(settings, database, token)
    with database.session() as session, session.begin():
        session.execute(update(User).where(User.id == uid).values(state="disabled"))
    assert str(uid) in {
        item["id"] for item in responsible_options(database, manager, ListQuery())["items"]
    }
    assert str(uid) not in {
        item["id"] for item in assignment_options(database, manager, ListQuery())["items"]
    }
    assert listing(database, manager, primary_agent_id=uid)["total"] == 1
