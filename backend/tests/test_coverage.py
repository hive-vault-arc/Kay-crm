"""Exact-phone handoff, scoped collaboration and working-hour reminders."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, time, timedelta
from typing import cast
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.contacts.contracts import ListQuery
from app.contacts.queries import assignment_options, read_detail
from app.deals.queries import read_detail as read_deal
from app.discovery.contracts import SearchQuery
from app.discovery.search import search
from app.files.models import Notification
from app.identity.security import IdentityError
from app.schedule.rules import ZONE
from app.work.contracts import NotificationQuery
from app.work.coverage import (
    CoverageProof,
    Kind,
    NewCoverageNote,
    acknowledge_note,
    read_coverage,
    read_notes,
    write_note,
)
from app.work.coverage_models import CoverageNote
from app.work.coverage_reminders import deliver_coverage
from app.work.notifications import mark_read, read_notifications
from tests.contact_support import actor, create_lead
from tests.deal_support import new, run
from tests.test_ownership import change, cid, confirmation, intent
from tests.test_schedule import policy

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]
PHONE = "+212600000001"


def lookup(database, token, secret, query=PHONE):
    result = search(database, token, SearchQuery(q=query), coverage_secret=secret)
    return cast(list[dict[str, str]], result["coverage"])


def proof_for(hits: list[dict[str, str]], kind: Kind, target: UUID) -> str:
    path, proof = next(hit["href"] for hit in hits if hit["id"] == str(target)).split("#")
    assert path == f"/handoff/{kind}/{target}"
    return proof


def test_exact_lookup_session_and_target_bound_with_append_only_retries(settings, database):
    _, owner = actor(settings, database)
    author_id, author = actor(settings, database)
    _, other = actor(settings, database)
    lead = create_lead(settings, database, owner)
    eid = UUID(str(lead["id"]))
    did = UUID(run(settings, database, owner, new(cid(lead)))["id"])
    secret = settings.facade_secret.get_secret_value()
    for q in ["SP05 contact synthétique", "+21260000000", "%212600000001"]:
        assert lookup(database, author, secret, q) == []
    hits = lookup(database, author, secret, "06 00 00 00 01")
    assert {(hit["kind"], hit["id"]) for hit in hits} == {
        ("enquiries", str(eid)),
        ("deals", str(did)),
    }
    assert lookup(database, owner, secret) == []
    assert search(database, author, SearchQuery(q=PHONE))["total"] == 0
    proof = proof_for(hits, "enquiries", eid)
    body = NewCoverageNote(proof=proof, body="Appel synthétique de permanence")
    for run_denied in (
        lambda: read_detail(database, author, "enquiries", eid),
        lambda: read_deal(database, author, did),
        lambda: read_notes(database, author, "enquiries", eid),
        lambda: read_coverage(database, other, secret, "enquiries", eid, body),
        lambda: read_coverage(database, author, secret, "deals", did, body),
        lambda: read_coverage(
            database,
            author,
            secret,
            "enquiries",
            eid,
            CoverageProof(proof=proof.replace(proof.split(".")[2], "1700000000")),
        ),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            run_denied()
    view = read_coverage(database, author, secret, "enquiries", eid, body)
    assert view["context"] == "Demande synthétique uniquement"
    assert view["items"] == []
    key = uuid4()
    # Two parallel retry paths commit one true author and return the same note.
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(
            executor.map(
                lambda _: write_note(database, author, secret, "enquiries", eid, body, key),
                range(2),
            )
        )
    assert results[0] == results[1]
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        write_note(
            database,
            author,
            secret,
            "enquiries",
            eid,
            body.model_copy(update={"body": "Autre texte"}),
            key,
        )
    lead_notes = read_notes(database, owner, "enquiries", eid)
    assert lead_notes["can_mark_seen"] is True
    assert lead_notes["items"][0]["body"] == body.body
    assert read_notes(database, owner, "deals", did)["items"] == []
    with database.session() as session:
        note = session.get(CoverageNote, UUID(results[0]["id"]))
        assert note.author_user_id == author_id
        assert note.seen_at is None
    deal_proof = proof_for(hits, "deals", did)
    assert read_coverage(database, author, secret, "deals", did, CoverageProof(proof=deal_proof))[
        "id"
    ] == str(did)


def test_primary_agent_can_share_and_collaborator_cannot_delegate(settings, database):
    _, owner = actor(settings, database)
    colleague_id, colleague = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    third_id, third = actor(settings, database)
    lead = create_lead(settings, database, owner)
    contact_id, target = cid(lead), UUID(str(lead["id"]))
    secret = settings.facade_secret.get_secret_value()
    old_proof = proof_for(lookup(database, colleague, secret), "enquiries", target)
    assert (
        assignment_options(database, owner, ListQuery(), collaboration_for=contact_id)["total"] == 2
    )
    grant = intent("collaborators", collaborator_ids=[str(colleague_id)])
    assert change(settings, database, owner, contact_id, grant)["version"] == 2
    assert read_detail(database, colleague, "enquiries", target)["id"] == str(target)
    assert lookup(database, colleague, secret) == []
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_coverage(
            database, colleague, secret, "enquiries", target, CoverageProof(proof=old_proof)
        )
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        confirmation(
            settings,
            database,
            colleague,
            contact_id,
            intent("collaborators", 2, collaborator_ids=[str(third_id)]),
        )
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        assignment_options(database, colleague, ListQuery(), collaboration_for=contact_id)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        confirmation(
            settings,
            database,
            owner,
            contact_id,
            intent("assign", 2, primary_agent_id=str(third_id)),
        )
    handoff = proof_for(lookup(database, third, secret), "enquiries", target)
    change(
        settings,
        database,
        manager,
        contact_id,
        intent("assign", 2, primary_agent_id=str(colleague_id)),
    )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_coverage(database, third, secret, "enquiries", target, CoverageProof(proof=handoff))


def test_working_windows_repeat_unseen_and_acknowledge_from_dossier_or_inbox(settings, database):
    _, owner = actor(settings, database)
    _, author = actor(settings, database)
    _, admin = actor(settings, database, "administrator")
    lead = create_lead(settings, database, owner)
    eid = UUID(str(lead["id"]))
    did = UUID(run(settings, database, owner, new(cid(lead)))["id"])
    secret = settings.facade_secret.get_secret_value()
    hits = lookup(database, author, secret)
    ids = {
        kind: UUID(
            write_note(
                database,
                author,
                secret,
                kind,
                target,
                NewCoverageNote(proof=proof_for(hits, kind, target), body="Suivi synthétique"),
                uuid4(),
            )["id"]
        )
        for kind, target in (("enquiries", eid), ("deals", did))
    }
    today = datetime.now(ZONE).date()
    monday = today + timedelta(days=7 - today.weekday())
    policy(
        settings,
        database,
        admin,
        working_windows=[
            {"weekday": day, "start_local": "09:00", "end_local": "19:00"} for day in range(1, 6)
        ],
    )

    def at(hours: int, minutes: int = 0) -> datetime:
        return datetime.combine(monday, time(hours, minutes), ZONE).astimezone(UTC)

    assert deliver_coverage(database, at(8, 59)) == 0
    assert deliver_coverage(database, at(9)) == 2
    assert deliver_coverage(database, at(9)) == 0
    assert deliver_coverage(database, at(12, 59)) == 0
    assert deliver_coverage(database, at(13)) == 0
    assert deliver_coverage(database, at(14)) == 2
    assert deliver_coverage(database, at(17, 59)) == 0
    assert read_notifications(database, owner, NotificationQuery())["unread_total"] == 0
    assert (
        read_notifications(database, author, NotificationQuery(), coverage=True)["unread_total"]
        == 0
    )
    inbox = read_notifications(database, owner, NotificationQuery(), coverage=True)
    assert inbox["unread_total"] == 2
    assert all(item["created_at"] == at(14).isoformat() for item in inbox["items"])
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        acknowledge_note(database, author, "deals", did, ids["deals"])
    enquiry_alert = next(item for item in inbox["items"] if item["href"].startswith("/leads"))
    assert mark_read(database, owner, UUID(enquiry_alert["id"]), coverage=True) == {"read": True}
    assert acknowledge_note(database, owner, "deals", did, ids["deals"]) == {"read": True}
    assert deliver_coverage(database, at(18)) == 0
    assert (
        read_notifications(database, owner, NotificationQuery(), coverage=True)["unread_total"] == 0
    )
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Notification)) == 4
