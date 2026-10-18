"""SP-11 AT-12/39: explicit creation, exact proposals, fixed pipeline and current scope."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, update
from sqlalchemy.orm import Session

from app.contacts.models import ContactCollaborator
from app.contacts.queries import read_detail as contact_read
from app.deals.contracts import ChildQuery, DealQuery, EditCustomerOffer, NewDeal, Transition
from app.deals.history_models import DealStageEvent
from app.deals.models import Deal, DealReceipt
from app.deals.queries import read_children, read_detail, read_list
from app.identity.models import AGENCY_ID, Agency
from app.identity.security import IdentityError
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import edit, new, offer, run, setup
from tests.identity_support import observe_two_lock_waiters
from tests.test_inventory import offering_draft, property_draft
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_manual_creation_preserves_enquiry_and_derives_current_owner(settings, database):
    uid, token, contact, enquiry = setup(settings, database)
    assert read_list(database, token, DealQuery())["total"] == 0
    before = contact_read(database, token, "enquiries", enquiry)
    did = UUID(run(settings, database, token, new(contact))["id"])
    row = read_detail(database, token, did)
    assert row["contact"]["primary_agent"]["id"] == str(uid)
    assert row["enquiry_id"] is None and row["offering"] is None
    assert contact_read(database, token, "enquiries", enquiry) == before
    run(settings, database, token, new(contact, projects=[{"external_name": "Deuxième projet"}]))
    assert read_list(database, token, DealQuery(contact_id=contact))["total"] == 2
    history = read_children(database, token, did, "history", ChildQuery())
    assert history["total"] == 1 and history["items"][0]["actor"]["id"] == str(uid)


def test_stage_skips_and_accepted_offer_never_close_or_change_stock(settings, database):
    _, token, contact, _ = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    oid = UUID(offering_draft(settings, database, manager, pid, price="11999.99")["offering_id"])
    did = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(oid), expected_offering_version=1),
        )["id"]
    )
    inventory_before = read_detail(database, token, did)["offering"]
    result = run(settings, database, token, offer(amount_mad="9999999999999999.99"), did)
    proposal = UUID(result["customer_offer_id"])
    original = read_children(database, token, did, "customer-offers", ChildQuery())["items"][0]
    assert original["annual_amount_mad"] == "119999999999999999.88"
    accepted = EditCustomerOffer.model_validate(
        {
            "expected_version": 1,
            "expected_deal_version": 2,
            "amount_mad": "9999999999999999.99",
            "price_period": "month",
            "conditions": "Accord de prix, pas une clôture",
            "status": "accepted",
        }
    )
    run(settings, database, token, accepted, oid=proposal)
    row = read_detail(database, token, did)
    assert row["stage"] == "new" and row["offering"] == inventory_before
    run(
        settings,
        database,
        token,
        Transition(expected_version=3, stage="negotiation", reason="Visite non nécessaire"),
        did,
    )
    run(
        settings,
        database,
        token,
        Transition(expected_version=4, stage="documents", reason="Préparer les pièces"),
        did,
    )
    row = read_detail(database, token, did)
    assert row["stage"] == "documents" and row["offering"] == inventory_before
    history = read_children(database, token, did, "history", ChildQuery(page_size=100))["items"]
    assert len(history) == 5 and [h["after_version"] for h in history] == [5, 4, 3, 2, 1]
    assert history[2]["offer_status"] == "accepted" and history[3]["offer_status"] == "pending"
    assert history[3]["conditions"] == original["conditions"]


@pytest.mark.parametrize("stage", ["reserved", "won", "lost", "cancelled", "arbitrary"])
def test_no_ordinary_command_can_invent_reserved_or_outcome_stage(stage):
    for schema, values in (
        (NewDeal, new(uuid4()).model_dump(exclude={"stage"})),
        (Transition, {"expected_version": 1, "reason": "Synthétique"}),
    ):
        with pytest.raises(ValidationError):
            schema.model_validate({**values, "stage": stage})


def test_scope_before_filters_counts_pages_and_summaries(settings, database):
    _, owner, contact, _ = setup(settings, database)
    outsider_id, outsider = actor(settings, database)
    other = cid(create_lead(settings, database, outsider, new_lead("+212600000002")))
    private = UUID(
        run(settings, database, outsider, new(other, projects=[{"external_name": "Projet privé"}]))[
            "id"
        ]
    )
    for index in range(3):
        run(
            settings, database, owner, new(contact, projects=[{"external_name": f"Projet {index}"}])
        )
    first = read_list(database, owner, DealQuery(page_size=2))
    assert first["total"] == 3 and len(first["items"]) == 2 and first["has_next"]
    assert sum(first["stage_counts"].values()) == 3
    second = read_list(database, owner, DealQuery(page_size=2, page=2))
    assert len(second["items"]) == 1 and second["has_previous"]
    assert not ({r["id"] for r in first["items"]} & {r["id"] for r in second["items"]})
    for query in (
        DealQuery(q="Projet privé"),
        DealQuery(assigned_agent_id=outsider_id),
        DealQuery(q="%_"),
    ):
        result = read_list(database, owner, query)
        assert result["total"] == 0 and sum(result["stage_counts"].values()) == 0
    for operation in (
        lambda: read_detail(database, owner, private),
        lambda: read_children(database, owner, private, "history", ChildQuery()),
        lambda: read_children(database, owner, private, "customer-offers", ChildQuery()),
        lambda: run(settings, database, owner, edit(), private),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            operation()


def test_actual_version_race_and_same_key_create_have_one_effect(settings, database):
    _, token, contact, _ = setup(settings, database)
    key, body = uuid4(), new(contact)
    with ThreadPoolExecutor(max_workers=2) as pool:
        pending = [pool.submit(run, settings, database, token, body, key=key) for _ in range(2)]
        results = [future.result(5) for future in pending]
    assert results[0] == results[1]
    did = UUID(results[0]["id"])

    def compete():
        try:
            run(settings, database, token, edit(), did)
            return "saved"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.engine.begin() as locked:
            locked.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            pending = [pool.submit(compete) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
        assert sorted(future.result(5) for future in pending) == ["DEAL_VERSION_CONFLICT", "saved"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Deal)) == 1
        assert session.scalar(select(func.count()).select_from(DealStageEvent)) == 2
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(settings, database, token, new(contact, initial_budget="2000000"), key=key)


def test_revocation_after_real_lock_wait_and_current_scope_replay(settings, database):
    _, owner, contact, _ = setup(settings, database)
    uid, collaborator = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    change(settings, database, manager, contact, intent("collaborators", collaborator_ids=[uid]))
    key, body = uuid4(), new(contact)
    did = UUID(run(settings, database, collaborator, body, key=key)["id"])

    def replay():
        try:
            run(settings, database, collaborator, body, key=key)
            return "unexpected"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.engine.begin() as locked:
            locked.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            pending = [pool.submit(replay) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            locked.execute(
                update(ContactCollaborator)
                .where(
                    ContactCollaborator.contact_id == contact, ContactCollaborator.user_id == uid
                )
                .values(revoked_at=datetime.now(UTC))
            )
        assert [future.result(5) for future in pending] == ["NOT_FOUND", "NOT_FOUND"]
    assert read_detail(database, owner, did)["created_by_user_id"] == str(uid)


def test_actual_interruption_rolls_back_business_history_and_receipt(settings, database):
    _, token, contact, _ = setup(settings, database)

    def interrupt(session):
        if any(isinstance(row, DealReceipt) for row in session.new):
            raise RuntimeError("SP11_BEFORE_COMMIT")

    event.listen(Session, "before_commit", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SP11_BEFORE_COMMIT"):
            run(settings, database, token, new(contact))
    finally:
        event.remove(Session, "before_commit", interrupt)
    assert read_list(database, token, DealQuery())["total"] == 0
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealStageEvent)) == 0
        assert session.scalar(select(func.count()).select_from(DealReceipt)) == 0
