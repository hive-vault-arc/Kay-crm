"""Stock races, interrupted commands and current-scope historical outcomes."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.orm import Session

from app.deals.commands import apply
from app.deals.contracts import ChildQuery
from app.deals.outcome_models import DealOutcome, DealReopening
from app.deals.outcome_queries import outcomes, stock_review
from app.deals.queries import read_detail
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.inventory.contracts import EditProperty
from app.inventory.hierarchy_models import Development
from app.inventory.models import InventoryEvent
from app.inventory.queries import read_detail as property_detail
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new, run, setup
from tests.identity_support import observe_two_lock_waiters
from tests.test_inventory import run as inventory_command
from tests.test_outcomes import body, sale_fixture
from tests.test_ownership import change, cid, intent
from tests.test_reservations import fixture, project_fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("operation", ["close-close", "close-reserve", "reopen-reserve"])
def test_two_real_stock_transactions_wait_then_have_one_success(settings, database, operation):
    token, _, _, parent, _, _, _, deals = project_fixture(settings, database)
    if operation == "reopen-reserve":
        run(settings, database, token, body(database, token, deals[1]), deals[1])
        requests = [
            body(database, token, deals[1], reopen=True),
            reviewed(database, token, deals[0]),
        ]
        targets = [deals[1], deals[0]]
    else:
        requests = [
            body(database, token, deals[0]),
            body(database, token, deals[1])
            if operation == "close-close"
            else reviewed(database, token, deals[1]),
        ]
        targets = deals
    pids = set()

    def attempt(index):
        try:
            with database.session() as session, session.begin():
                pids.add(session.scalar(text("SELECT pg_backend_pid()")))
                apply(
                    session, current_identity(session, token), requests[index], targets[index], None
                )
            return "ok"
        except IdentityError as failure:
            return failure.code

    with database.session() as blocker, blocker.begin(), ThreadPoolExecutor(2) as pool:
        blocker.scalar(select(Development).where(Development.id == parent).with_for_update())
        attempts = [pool.submit(attempt, i) for i in range(2)]
        observe_two_lock_waiters(database, "development")
        blocker.commit()
        results = [f.result(timeout=12) for f in attempts]
    assert len(pids) == 2 and results.count("ok") == 1
    assert set(results) <= {
        "ok",
        "STOCK_REVIEW_CHANGED",
        "INVENTORY_VERSION_CONFLICT",
        "OFFERING_NOT_AVAILABLE",
        "STOCK_REVIEW_REQUIRED",
        "DEVELOPMENT_OVERLAP",
        "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED",
    }


@pytest.mark.parametrize("committed", [False, True])
def test_interruption_rolls_back_or_replays_original_once(settings, database, committed):
    _, token, _, _, _, _, did = fixture(settings, database)
    request, key = body(database, token, did), uuid4()
    hook = "after_commit" if committed else "before_commit"

    def interrupted(session):
        raise RuntimeError("SYNTHETIC_RESPONSE_INTERRUPTION")

    event.listen(Session, hook, interrupted, once=True)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_RESPONSE_INTERRUPTION"):
            run(settings, database, token, request, did, key=key)
    finally:
        event.remove(Session, hook, interrupted)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == int(committed)
    original = run(settings, database, token, request, did, key=key)
    assert run(settings, database, token, request, did, key=key) == original
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == 1


def test_intervening_inventory_change_blocks_reopen_without_erasing_outcome(settings, database):
    _, token, _, manager, pid, _, did = fixture(settings, database)
    run(settings, database, token, body(database, token, did), did)
    current = property_detail(database, manager, pid)
    fields = {
        key: current.get(key)
        for key in (
            "reference",
            "category",
            "marketing_name",
            "location",
            "area_sqm",
            "development_id",
            "floor_id",
            "unit_type_id",
            "rooms",
        )
    }
    fields["location"] = "Localisation synthétique réexaminée"
    inventory_command(
        settings,
        database,
        manager,
        "edit-property",
        EditProperty(expected_version=current["version"], **fields),
        pid,
    )
    assert stock_review(database, token, did)["stock"]["conflict"] == "STOCK_REVIEW_REQUIRED"
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(settings, database, token, body(database, token, did, reopen=True), did)
    assert read_detail(database, token, did)["stage"] == "won"
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == 1
        assert session.scalar(select(func.count()).select_from(DealReopening)) == 0


def test_current_scope_and_primary_at_close_survive_transfer_reopen_and_second_close(
    settings, database
):
    uid, token, contact, manager, _, _, did = fixture(settings, database)
    request, key = body(database, token, did), uuid4()
    run(settings, database, token, request, did, key=key)
    other_id, other = actor(settings, database)
    change(settings, database, manager, contact, intent("assign", primary_agent_id=other_id))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, request, did, key=key)
    original = outcomes(database, other, did, ChildQuery())["items"][0]
    assert original["primary_agent_at_close_id"] == str(uid)
    assert read_detail(database, other, did)["contact"]["primary_agent"]["id"] == str(other_id)
    run(settings, database, other, body(database, other, did, reopen=True), did)
    run(settings, database, other, body(database, other, did), did)
    history = outcomes(database, other, did, ChildQuery())["items"]
    assert [h["primary_agent_at_close_id"] for h in history] == [str(other_id), str(uid)]
    assert history[1]["actor"]["id"] == str(uid)


def test_archive_is_readonly_and_merge_preserves_outcome_authors_targets(settings, database):
    uid, token, contact, manager, _, oid, did = fixture(settings, database)
    run(settings, database, token, body(database, token, did), did)
    change(settings, database, manager, contact, intent("archive"))
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(settings, database, manager, body(database, manager, did, reopen=True), did)
    change(settings, database, manager, contact, intent("restore", version=2))
    survivor = cid(create_lead(settings, database, token, new_lead("+212600000002")))
    change(
        settings,
        database,
        manager,
        contact,
        intent("merge", version=3, survivor_id=survivor, survivor_expected_version=1),
    )
    retained = outcomes(database, token, did, ChildQuery())["items"][0]
    assert retained["offering_id"] == str(oid) and retained["actor"]["id"] == str(uid)
    assert read_detail(database, token, did)["origin_contact_id"] == str(contact)
    assert read_detail(database, token, did)["contact"]["id"] == str(survivor)


def test_lost_without_target_reopens_without_claiming_stock(settings, database):
    _, token, contact, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(contact))["id"])
    run(settings, database, token, body(database, token, did, outcome="lost"), did)
    run(settings, database, token, body(database, token, did, reopen=True), did)
    assert read_detail(database, token, did)["offering"] is None


def test_private_explanation_never_appears_in_shared_inventory_history(settings, database):
    token, _, _, _, _, _, _, did = sale_fixture(settings, database)
    run(settings, database, token, body(database, token, did), did)
    with database.session() as session:
        assert all("Accord privé" not in e.reason for e in session.scalars(select(InventoryEvent)))
