"""SP-12 persistent stock commands against isolated PostgreSQL, never SQLite."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deals.contracts import ChildQuery, ReleaseReservation, Reserve, Transition
from app.deals.models import DealReceipt
from app.deals.queries import read_children, read_detail
from app.files.models import OutboxEvent
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.inventory.contracts import EditOffering, Owners
from app.inventory.hierarchy_models import Development
from app.inventory.reservation_models import Reservation
from tests.contact_support import actor
from tests.deal_support import edit, new, run, setup
from tests.identity_support import observe_two_lock_waiters
from tests.test_developments import campaign, development, unit
from tests.test_developments import confirm as confirm_development
from tests.test_developments import read as read_development
from tests.test_inventory import confirm, offering_draft, owners, property_draft
from tests.test_inventory import run as stock_command
from tests.test_ownership import change, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def fixture(settings, database):
    uid, token, contact, _ = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    owners(settings, database, manager, pid, [contact])
    oid = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    confirm(settings, database, manager, pid, oid)
    did = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(oid), expected_offering_version=2),
        )["id"]
    )
    return uid, token, contact, manager, pid, oid, did


def reviewed(database, token, did, reason=None):
    detail = read_detail(database, token, did)
    offering = detail["offering"]
    target = offering["target"]
    fields = dict(
        expected_version=detail["version"],
        offering_id=UUID(offering["id"]),
        expected_offering_version=offering["version"],
        expected_target_version=target["version"],
        expected_development_version=target["development_version"],
    )
    return ReleaseReservation(**fields, reason=reason) if reason is not None else Reserve(**fields)


def test_persistent_reserve_retry_explicit_release_history(settings, database):
    _, token, _, _, _, _, did = fixture(settings, database)
    body, key = reviewed(database, token, did), uuid4()
    first = run(settings, database, token, body, did, key=key)
    assert first["version"] == 2
    assert run(settings, database, token, body, did, key=key) == first
    detail = read_detail(database, token, did)
    assert detail["stage"] == "reserved" and detail["offering"]["state"] == "reserved"
    assert detail["active_reservation"]["previous_stage"] == "new"
    release = reviewed(database, token, did, "Libération synthétique explicite")
    result = run(settings, database, token, release, did)
    assert result["version"] == 3
    detail = read_detail(database, token, did)
    assert detail["stage"] == "new" and detail["offering"]["state"] == "available"
    assert detail["active_reservation"] is None
    assert run(settings, database, token, body, did, key=key) == first
    assert read_detail(database, token, did)["offering"]["state"] == "available"
    with database.session() as session:
        row = session.scalar(select(Reservation))
        assert row.released_at is not None and row.release_reason == release.reason
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 2
    history = read_children(database, token, did, "history", ChildQuery())["items"]
    assert [e["action"] for e in history] == [
        "reservation.released",
        "reservation.created",
        "created",
    ]


def test_hold_survives_progress_and_cannot_retarget(settings, database):
    _, token, _, _, _, _, did = fixture(settings, database)
    run(settings, database, token, reviewed(database, token, did), did)
    with pytest.raises(IdentityError, match="RESERVATION_RELEASE_REQUIRED"):
        run(settings, database, token, edit(version=2), did)
    run(
        settings,
        database,
        token,
        Transition(expected_version=2, stage="documents", reason="Contrat"),
        did,
    )
    assert read_detail(database, token, did)["active_reservation"] is not None
    run(settings, database, token, reviewed(database, token, did, "Annulation du blocage"), did)
    assert read_detail(database, token, did)["stage"] == "documents"


def project_fixture(settings, database):
    _, token, contact, _ = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    parent = development(settings, database, manager)
    pid = unit(settings, database, manager, parent, category="villa")
    owners(settings, database, manager, pid, [contact])
    stock_command(
        settings,
        database,
        manager,
        "development-owners",
        Owners(
            expected_version=read_development(database, manager, target=parent)["version"],
            owners=[{"contact_id": contact}],
        ),
        parent,
    )
    oid = UUID(
        offering_draft(settings, database, manager, pid, kind="sale", period=None)["offering_id"]
    )
    confirm(settings, database, manager, pid, oid)
    whole = UUID(campaign(settings, database, manager, parent)["offering_id"])
    confirm_development(settings, database, manager, parent, whole)
    deals = [
        UUID(
            run(
                settings,
                database,
                token,
                new(contact, offering_id=str(o), expected_offering_version=2),
            )["id"]
        )
        for o in (oid, whole)
    ]
    return token, contact, manager, parent, pid, oid, whole, deals


@pytest.mark.parametrize("same", [True, False])
def test_forced_two_postgresql_sessions_compete_at_development_lock(settings, database, same):
    from app.deals.commands import apply

    token, contact, _, parent, _, oid, _, deals = project_fixture(settings, database)
    if same:
        deals[1] = UUID(
            run(
                settings,
                database,
                token,
                new(contact, offering_id=str(oid), expected_offering_version=2),
            )["id"]
        )
    bodies = [reviewed(database, token, d) for d in deals]
    pids = set()

    def attempt(index):
        try:
            with database.session() as session, session.begin():
                pids.add(session.scalar(text("SELECT pg_backend_pid()")))
                apply(session, current_identity(session, token), bodies[index], deals[index], None)
            return "ok"
        except IdentityError as error:
            return error.code

    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Development).where(Development.id == parent).with_for_update())
        futures = [pool.submit(attempt, i) for i in range(2)]
        observe_two_lock_waiters(database, "development")
        blocker.commit()
        assert sorted(f.result(timeout=10) for f in futures) == [
            "RESERVATION_CONFLICT" if same else "DEVELOPMENT_OVERLAP",
            "ok",
        ]
    assert len(pids) == 2
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Reservation)) == 1
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 1


def test_project_unit_direction_cross_kind_and_sibling_independence(settings, database):
    token, contact, manager, parent, pid, oid, whole, deals = project_fixture(settings, database)
    run(settings, database, token, reviewed(database, token, deals[1]), deals[1])
    with pytest.raises(IdentityError, match="DEVELOPMENT_OVERLAP"):
        run(settings, database, token, reviewed(database, token, deals[0]), deals[0])
    rental = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    confirm(settings, database, manager, pid, rental)
    other = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(rental), expected_offering_version=2),
        )["id"]
    )
    run(settings, database, token, reviewed(database, token, other), other)
    run(
        settings,
        database,
        token,
        reviewed(database, token, deals[1], "Libérer le programme"),
        deals[1],
    )
    run(settings, database, token, reviewed(database, token, deals[0]), deals[0])
    sibling = unit(settings, database, manager, parent, category="villa")
    owners(settings, database, manager, sibling, [contact])
    sibling_offer = UUID(
        offering_draft(settings, database, manager, sibling, kind="sale", period=None)[
            "offering_id"
        ]
    )
    confirm(settings, database, manager, sibling, sibling_offer)
    sibling_deal = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(sibling_offer), expected_offering_version=2),
        )["id"]
    )
    run(settings, database, token, reviewed(database, token, sibling_deal), sibling_deal)
    with pytest.raises(IdentityError, match="DEVELOPMENT_OVERLAP"):
        run(settings, database, token, reviewed(database, token, deals[1]), deals[1])
    with database.session() as session:
        assert (
            session.scalar(
                select(func.count())
                .select_from(Reservation)
                .where(Reservation.released_at.is_(None))
            )
            == 3
        )


def test_current_scope_retry_transfer_and_release_actor(settings, database):
    _, token, contact, manager, _, _, did = fixture(settings, database)
    body, key = reviewed(database, token, did), uuid4()
    result = run(settings, database, token, body, did, key=key)
    outsider, other_token = actor(settings, database)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, other_token, body, did)
    change(settings, database, manager, contact, intent("assign", primary_agent_id=outsider))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, body, did, key=key)
    run(
        settings,
        database,
        other_token,
        reviewed(database, other_token, did, "Transfert puis libération"),
        did,
    )
    with database.session() as session:
        assert session.scalar(select(Reservation)).released_by_user_id == outsider
    assert result["version"] == 2


def test_interruption_after_commit_replay_and_before_commit_rollback(settings, database):
    _, token, _, _, _, _, did = fixture(settings, database)
    body, key = reviewed(database, token, did), uuid4()

    def interrupt(session):
        raise RuntimeError("SYNTHETIC_RESPONSE_INTERRUPTED")

    event.listen(Session, "after_commit", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_RESPONSE_INTERRUPTED"):
            run(settings, database, token, body, did, key=key)
    finally:
        event.remove(Session, "after_commit", interrupt)
    assert run(settings, database, token, body, did, key=key)["version"] == 2

    def rollback(session, context, instances):
        if any(isinstance(row, DealReceipt) for row in session.new):
            raise RuntimeError("SYNTHETIC_BEFORE_COMMIT")

    release = reviewed(database, token, did, "Motif conservé malgré interruption")
    event.listen(Session, "before_flush", rollback)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_BEFORE_COMMIT"):
            run(settings, database, token, release, did)
    finally:
        event.remove(Session, "before_flush", rollback)
    assert read_detail(database, token, did)["active_reservation"] is not None
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 1
    run(settings, database, token, release, did)


@pytest.mark.parametrize(
    "field", ["expected_version", "expected_target_version", "expected_offering_version"]
)
def test_stale_versions_fail_without_any_effect(settings, database, field):
    _, token, _, _, _, _, did = fixture(settings, database)
    body = reviewed(database, token, did)
    bad = body.model_copy(update={field: 999})
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        run(settings, database, token, bad, did)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Reservation)) == 0
        assert session.scalar(select(func.count()).select_from(OutboxEvent)) == 0


def test_no_expiry_and_invalid_release_or_expiry_input(settings, database, monkeypatch):
    _, token, contact, _, _, oid, did = fixture(settings, database)
    run(settings, database, token, reviewed(database, token, did), did)
    from app.deals import commands

    class Later(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2040, 1, 1, tzinfo=UTC)

    monkeypatch.setattr(commands, "datetime", Later)
    other = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(oid), expected_offering_version=3),
        )["id"]
    )
    with pytest.raises(IdentityError, match="RESERVATION_CONFLICT"):
        run(settings, database, token, reviewed(database, token, other), other)
    assert read_detail(database, token, did)["active_reservation"] is not None
    fields = reviewed(database, token, did).model_dump()
    for extra in ({"expires_at": "2040-01-01"}, {"actor_id": str(uuid4())}):
        with pytest.raises(ValidationError):
            Reserve.model_validate({**fields, **extra})
    with pytest.raises(ValidationError):
        ReleaseReservation(**fields, reason="  ")


@pytest.mark.parametrize(
    "operation", ["offering", "retarget", "history", "release", "owner", "price", "kind"]
)
def test_direct_sql_cannot_bypass_persistent_hold(settings, database, operation):
    _, token, _, _, pid, oid, did = fixture(settings, database)
    run(settings, database, token, reviewed(database, token, did), did)
    sql = {
        "offering": "UPDATE offering SET state='available' WHERE id=:oid",
        "retarget": "UPDATE deal SET offering_id=NULL WHERE id=:did",
        "history": "DELETE FROM reservation WHERE deal_id=:did",
        "release": "UPDATE reservation SET released_at=now() WHERE deal_id=:did",
        "owner": "UPDATE property_owner SET archived_at=now() WHERE property_id=:pid",
        "price": "UPDATE offering SET price_mad=9999 WHERE id=:oid",
        "kind": "UPDATE offering SET kind='sale',price_period=NULL WHERE id=:oid",
    }[operation]
    with pytest.raises(IntegrityError), database.engine.begin() as connection:
        connection.execute(text(sql), {"oid": oid, "did": did, "pid": pid})
    assert read_detail(database, token, did)["offering"]["state"] == "reserved"


def test_manager_campaign_update_and_confirmation_require_release(settings, database):
    _, token, _, manager, pid, oid, did = fixture(settings, database)
    run(settings, database, token, reviewed(database, token, did), did)
    detail = read_detail(database, token, did)
    with pytest.raises(IdentityError, match="RESERVATION_RELEASE_REQUIRED"):
        stock_command(
            settings,
            database,
            manager,
            "edit-offering",
            EditOffering(
                expected_property_version=detail["offering"]["target"]["version"],
                expected_version=3,
                state="withdrawn",
                price_mad="1234.56",
                price_period="month",
                reason="Retrait interdit sous réservation",
            ),
            oid,
        )
    with pytest.raises(IdentityError, match="RESERVATION_RELEASE_REQUIRED"):
        confirm(settings, database, manager, pid, oid)


def test_active_hold_archive_restore_and_manager_release(settings, database):
    _, token, contact, manager, _, _, did = fixture(settings, database)
    original = reviewed(database, token, did)
    key = uuid4()
    run(settings, database, token, original, did, key=key)
    change(settings, database, manager, contact, intent("archive"))
    hold = read_detail(database, manager, did)["active_reservation"]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, original, did, key=key)
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(
            settings,
            database,
            manager,
            reviewed(database, manager, did, "Pas de libération cachée"),
            did,
        )
    assert read_detail(database, manager, did)["active_reservation"] == hold
    change(settings, database, manager, contact, intent("restore", version=2))
    run(settings, database, manager, reviewed(database, manager, did, "Restauré puis libéré"), did)


def test_merge_preview_invalidated_by_hold_and_original_authorship_retained(settings, database):
    from app.contacts.ownership import mutate
    from tests.contact_support import create_lead, new_lead
    from tests.test_ownership import cid, confirmation

    uid, token, source, manager, _, _, did = fixture(settings, database)
    survivor = cid(create_lead(settings, database, token, new_lead("+212600000002")))
    operation = intent("merge", survivor_id=survivor, survivor_expected_version=1)
    previous = confirmation(settings, database, manager, source, operation)
    run(settings, database, token, reviewed(database, token, did), did)
    hold = read_detail(database, token, did)["active_reservation"]
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database,
            manager,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            source,
            previous,
            "merge",
        )
    change(settings, database, manager, source, operation)
    current = read_detail(database, token, did)
    assert current["contact"]["id"] == str(survivor)
    assert current["origin_contact_id"] == str(source)
    assert current["active_reservation"] == hold
    history = read_children(database, token, did, "history", ChildQuery())["items"]
    assert history[0]["action"] == "contact_merged"
    assert history[1]["action"] == "reservation.created" and history[1]["actor"]["id"] == str(uid)
