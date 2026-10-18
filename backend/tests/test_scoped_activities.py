"""Real PostgreSQL proves separate immutable activities and exact conversion lineage."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.activities.contracts import MANUAL_KINDS, ActivityQuery, NewActivity
from app.activities.service import append_activity, read_activities
from app.contacts.history import read_history
from app.contacts.history_models import TimelineEvent
from app.contacts.ownership import mutate
from app.contacts.ownership_contracts import EnquiryAssignment, NewNote
from app.contacts.queries import read_detail as read_contact_detail
from app.deals.queries import read_detail
from app.identity.security import IdentityError, csrf_token
from app.main import create_app
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new, run
from tests.test_auth import authority
from tests.test_foundation import client_for
from tests.test_isolation_migrations import migrate
from tests.test_lead_conversion import conversion
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def append(settings, database, token, scope, target, key=None, **fields):
    return append_activity(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        scope,
        target,
        NewActivity.model_validate({"body": "Note synthétique", **fields}),
    )


def history(database, token, scope, target, **query):
    return read_activities(database, token, scope, target, ActivityQuery(**query))


def test_additive_migration_preserves_existing_history(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    before = history(database, token, "enquiries", eid)
    assert migrate("downgrade", "0024_deal_qualification_history").returncode == 0
    assert migrate("upgrade", "head").returncode == 0
    assert history(database, token, "enquiries", eid) == before
    assert migrate("check").returncode == 0


def test_conversion_preserves_exact_lead_entries_and_separate_deal_notes(settings, database):
    uid, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    contact = cid(lead)
    for kind in MANUAL_KINDS:
        append(
            settings,
            database,
            token,
            "enquiries",
            eid,
            kind=kind,
            duration_minutes=5,
            direction="outbound",
            projects=["Programme synthétique", "Autre projet"],
        )
    before = history(database, token, "enquiries", eid)
    unrelated = create_lead(
        settings, database, token, new_lead(new_contact=None, contact_id=str(contact))
    )
    private_note = append(
        settings,
        database,
        token,
        "enquiries",
        UUID(unrelated["id"]),
        body="Autre Lead du même client",
    )
    mutate(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        contact,
        NewNote(body="Note du contact seulement"),
        "notes",
    )
    did = UUID(run(settings, database, token, conversion(), eid)["id"])
    own = append(
        settings, database, token, "deals", did, kind="message", body="Note propre à cette affaire"
    )
    origin = read_activities(database, token, "deals", did, ActivityQuery(), origin=True)
    own_rows = history(database, token, "deals", did)
    assert origin["origin_enquiry_id"] == str(eid)
    assert all(row in origin["items"] for row in before["items"])
    assert private_note["id"] not in {row["id"] for row in origin["items"]}
    assert own["id"] not in {row["id"] for row in origin["items"]}
    assert not any(
        row["action"] in MANUAL_KINDS and row["id"] != own["id"] for row in own_rows["items"]
    )
    assert not any(
        row["body"] == "Note du contact seulement" for row in origin["items"] + own_rows["items"]
    )
    filtered = history(database, token, "enquiries", eid, kind="call")
    assert filtered["total"] == 1
    assert filtered["items"][0]["actor"]["id"] == str(uid)
    assert filtered["items"][0]["duration_minutes"] == 5
    assert filtered["items"][0]["direction"] == "outbound"
    assert filtered["items"][0]["projects"] == ["Programme synthétique", "Autre projet"]
    assert origin["total"] == before["total"] + 1
    assert read_detail(database, token, did)["version"] == 1
    assert (
        len(read_history(database, token, contact, "timeline", 1, 100)["items"]) > origin["total"]
    )


def test_retries_concurrency_rollback_and_page_boundaries(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda _: append(settings, database, token, "enquiries", eid, key, kind="call"),
                range(2),
            )
        )
    assert results[0] == results[1]
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        append(settings, database, token, "enquiries", eid, key, body="Changement du même intent")
    assert history(database, token, "enquiries", eid, kind="call")["total"] == 1
    before = history(database, token, "enquiries", eid)["total"]

    def interrupt(session):
        raise RuntimeError("SYNTHETIC_BEFORE_COMMIT")

    event.listen(Session, "before_commit", interrupt)
    failed_key = uuid4()
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_BEFORE_COMMIT"):
            append(settings, database, token, "enquiries", eid, failed_key)
    finally:
        event.remove(Session, "before_commit", interrupt)
    assert history(database, token, "enquiries", eid)["total"] == before
    append(settings, database, token, "enquiries", eid, failed_key)
    assert history(database, token, "enquiries", eid)["total"] == before + 1
    pages = [
        history(database, token, "enquiries", eid, page=page, page_size=1) for page in (1, 2, 3)
    ]
    assert len({result["items"][0]["id"] for result in pages}) == 3
    assert pages[0]["has_next"] and not pages[0]["has_previous"]
    assert pages[2]["has_previous"] and not pages[2]["has_next"]


def test_current_scope_archive_and_replay_recheck(settings, database):
    _, token = actor(settings, database)
    other, outsider = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    lead = create_lead(settings, database, token)
    eid, key = UUID(lead["id"]), uuid4()
    result = append(settings, database, token, "enquiries", eid, key)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        history(database, outsider, "enquiries", eid)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        append(settings, database, outsider, "enquiries", eid)
    change(settings, database, manager, cid(lead), intent("assign", primary_agent_id=str(other)))
    for operation in (
        lambda: history(database, token, "enquiries", eid),
        lambda: append(settings, database, token, "enquiries", eid, key),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()
    # Transfer intentionally clears assignments that no longer have contact access.
    current = read_contact_detail(database, manager, "enquiries", eid)
    mutate(
        database,
        manager,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        eid,
        EnquiryAssignment(
            expected_version=current["version"],
            assigned_agent_id=other,
            reason="Réattribution synthétique",
        ),
        "enquiry-assign",
    )
    assert result["id"] in {
        row["id"] for row in history(database, outsider, "enquiries", eid)["items"]
    }
    change(settings, database, manager, cid(lead), intent("archive", version=2))
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        append(settings, database, manager, "enquiries", eid)
    assert history(database, manager, "enquiries", eid)["total"] >= 2


def test_manual_deal_has_no_origin_and_context_is_not_contact_wide(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    did = UUID(run(settings, database, token, new(cid(lead)))["id"])
    result = read_activities(database, token, "deals", did, ActivityQuery(), origin=True)
    assert result["items"] == [] and result["total"] == 0 and result["origin_enquiry_id"] is None
    append(settings, database, token, "deals", did)
    assert history(database, token, "enquiries", UUID(lead["id"]), kind="note")["total"] == 0


def test_merge_retains_original_context_author_time_and_new_append(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    append(settings, database, token, "enquiries", eid, projects=["Projet d’origine"])
    did = UUID(run(settings, database, token, conversion(), eid)["id"])
    before = read_activities(database, token, "deals", did, ActivityQuery(), origin=True)
    survivor = cid(create_lead(settings, database, token, new_lead("+33600000002")))
    change(
        settings,
        database,
        token,
        cid(lead),
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    after = read_activities(database, token, "deals", did, ActivityQuery(), origin=True)
    assert all(row in after["items"] for row in before["items"])
    append(settings, database, token, "deals", did, body="Après fusion")
    assert history(database, token, "deals", did, kind="note")["total"] == 1


@pytest.mark.anyio
async def test_http_guards_strict_queries_and_current_scope(settings, database):
    _, token = actor(settings, database)
    _, outsider = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    path = f"/api/v1/enquiries/{eid}/activities"
    async with client_for(create_app(settings)) as client:
        assert (await client.get(path)).status_code == 403
        for bad in ({**headers, "Origin": "null"}, {**headers, "X-CSRF-Token": "bad"}):
            assert (
                await client.post(path, headers=bad, json={"body": "Synthétique"})
            ).status_code == 403
        for suffix in ("?page=1&page=2", "?unknown=x", "?kind=private", "?page_size=101"):
            assert (await client.get(path + suffix, headers=headers)).status_code == 422
        assert (
            await client.post(path + "?unknown=x", headers=headers, json={"body": "Synthétique"})
        ).status_code == 422
        assert (
            await client.post(
                path, headers=headers, json={"body": "Synthétique", "actor": str(uuid4())}
            )
        ).status_code == 422
        response = await client.post(path, headers=headers, json={"body": "Synthétique"})
        assert response.status_code == 200
        assert (
            await client.post(path, headers=headers, json={"body": "Synthétique"})
        ).json() == response.json()
        result = await client.get(path + "?kind=note", headers=headers)
        assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
        assert result.json()["total"] == 1
        assert (
            await client.get(path, headers={**headers, "X-Kay-Session": outsider})
        ).status_code == 404
        assert (
            await client.get(f"/api/v1/deals/{uuid4()}/origin-activities", headers=headers)
        ).status_code == 404


@pytest.mark.parametrize(
    "fields",
    [
        {"body": " "},
        {"body": "Nul\x00interdit"},
        {"projects": ["Nul\x00interdit"]},
        {"duration_minutes": 0},
        {"duration_minutes": 1441},
        {"duration_minutes": True},
        {"duration_minutes": 1.5},
        {"direction": "sideways"},
        {"projects": [""]},
        {"projects": ["A", "a"]},
        {"projects": ["A"] * 4},
        {"actor_user_id": str(uuid4())},
        {"occurred_at": "2020-01-01T00:00:00Z"},
        {"deal_id": str(uuid4())},
    ],
)
def test_manual_body_cannot_spoof_actor_time_context_or_unbounded_fields(fields):
    with pytest.raises(ValidationError):
        NewActivity.model_validate({"body": "Synthétique", **fields})


def test_database_history_is_immutable_and_metadata_bounded(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    saved = append(settings, database, token, "enquiries", eid)
    with pytest.raises(IntegrityError, match="BUSINESS_HISTORY_IMMUTABLE"):
        with database.session() as session, session.begin():
            session.execute(
                update(TimelineEvent)
                .where(TimelineEvent.id == UUID(saved["id"]))
                .values(body="Modification interdite")
            )
    for fields in (
        {"duration_minutes": 0},
        {"direction": "sideways"},
        {"activity_projects": [{"private": "value"}]},
        {"enquiry_id": None, "deal_id": None, "duration_minutes": 5},
        {"body": " "},
        {"contact_id": cid(create_lead(settings, database, token, new_lead("+33600000003")))},
    ):
        with pytest.raises(IntegrityError):
            with database.session() as session, session.begin():
                values = {
                    "contact_id": cid(lead),
                    "enquiry_id": eid,
                    "actor_name": "Synthétique",
                    "action": "note",
                    "body": "Synthétique",
                    **fields,
                }
                session.add(TimelineEvent(**values))
    assert migrate("downgrade", "0024_deal_qualification_history").returncode != 0
    assert history(database, token, "enquiries", eid, kind="note")["items"][0]["id"] == saved["id"]
    assert migrate("check").returncode == 0
