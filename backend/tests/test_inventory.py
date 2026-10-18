"""SP-07/AT-06/08/27/31 on the guarded real PostgreSQL stack."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.models import ContactCollaborator
from app.contacts.ownership import mutate
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, AuditEvent, User
from app.identity.security import IdentityError
from app.inventory.commands import command
from app.inventory.contracts import (
    ConfirmAvailability,
    EditOffering,
    EditProperty,
    InventoryQuery,
    NewOffering,
    Owners,
    PropertyFields,
)
from app.inventory.models import InventoryEvent, InventoryReceipt, PropertyOwner
from app.inventory.queries import read_detail, read_history, read_list
from app.settings import Settings
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_ownership import change, cid, confirmation, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def run(
    settings: Settings, database: Database, token: str, operation: str, body, target=None, key=None
):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        operation,
        body,
        target,
    )


def property_draft(settings, database, token, category="apartment", reference=None):
    result = run(
        settings,
        database,
        token,
        "create-property",
        PropertyFields(reference=reference or f"SP07-{uuid4().hex}", category=category),
    )
    return UUID(result["property_id"])


def offering_draft(settings, database, token, pid, kind="rental", price="1234.56", period="month"):
    version = read_detail(database, token, pid)["version"]
    return run(
        settings,
        database,
        token,
        "create-offering",
        NewOffering(
            property_id=pid,
            expected_property_version=version,
            kind=kind,
            price_mad=price,
            price_period=period,
            conditions="Conditions initiales synthétiques",
        ),
    )


def confirm(settings, database, token, pid, oid, key=None):
    detail = read_detail(database, token, pid)
    offering = next(row for row in detail["offerings"] if row["id"] == str(oid))
    body = ConfirmAvailability(
        expected_version=detail["version"],
        offering_id=oid,
        expected_offering_version=offering["version"],
        reason="Disponibilité vérifiée synthétiquement",
    )
    return run(settings, database, token, "confirm-availability", body, pid, key)


def owners(settings, database, token, pid, cids):
    return run(
        settings,
        database,
        token,
        "owners",
        Owners(
            expected_version=read_detail(database, token, pid)["version"],
            owners=[
                {"contact_id": str(c), "marketing_display": f"Vendeur autorisé {index + 1}"}
                for index, c in enumerate(cids)
            ],
        ),
        pid,
    )


@pytest.mark.parametrize("category", ["villa", "house", "apartment", "land"])
def test_four_standalone_categories_and_both_campaigns(settings, database, category):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    contact = cid(create_lead(settings, database, at))
    pid = property_draft(settings, database, mt, category)
    draft = read_detail(database, at, pid)
    assert draft["category"] == category and draft["location"] is None and draft["area_sqm"] is None
    assert "development_id" not in draft and draft["owners"] == []
    rental = offering_draft(settings, database, mt, pid)
    with pytest.raises(IdentityError, match="AVAILABILITY_OWNER_REQUIRED"):
        confirm(settings, database, mt, pid, UUID(rental["offering_id"]))
    owners(settings, database, mt, pid, [contact])
    sale = offering_draft(settings, database, mt, pid, "sale", "900000.01", None)
    for result in (rental, sale):
        confirm(settings, database, mt, pid, UUID(result["offering_id"]))
    facts = read_detail(database, at, pid)
    campaigns = {row["kind"]: row for row in facts["offerings"]}
    assert campaigns["rental"]["annual_equivalent_mad"] == "14814.72"
    assert campaigns["sale"]["annual_equivalent_mad"] is None
    assert campaigns["sale"]["price_mad"] == "900000.01"
    assert all(row["state"] == "available" for row in campaigns.values())
    assert (
        read_list(database, at, "properties", InventoryQuery(category=category, state="available"))[
            "total"
        ]
        == 1
    )


def test_owner_privacy_current_scope_no_implicit_contact_grant(settings, database):
    _, mt = actor(settings, database, "administrator")
    aid, at = actor(settings, database)
    bid, bt = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    pid = property_draft(settings, database, mt)
    owners(settings, database, mt, pid, [owner])
    hidden = read_detail(database, bt, pid)
    assert hidden["owners"] == [{"marketing_display": "Vendeur autorisé 1", "contact": None}]
    assert str(owner) not in str(hidden) and "SP05 contact" not in str(hidden)
    assert "phone" not in str(hidden) and "origin_contact" not in str(hidden)
    assert read_detail(database, at, pid)["owners"][0]["contact"]["id"] == str(owner)
    with database.session() as session, session.begin():
        session.add(ContactCollaborator(contact_id=owner, user_id=bid))
    assert read_detail(database, bt, pid)["owners"][0]["contact"]["id"] == str(owner)
    with database.session() as session, session.begin():
        session.get(ContactCollaborator, (owner, bid)).revoked_at = datetime.now(UTC)
    assert read_detail(database, bt, pid)["owners"][0]["contact"] is None
    change(settings, database, mt, owner, intent("archive"))
    assert read_detail(database, at, pid)["owners"][0]["contact"] is None
    assert read_detail(database, mt, pid)["owners"][0]["contact"]["id"] == str(owner)
    assert aid != bid


def test_draft_availability_reconfirmation_withdrawal_and_exact_history(settings, database):
    uid, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    pid = property_draft(settings, database, mt)
    result = offering_draft(settings, database, mt, pid, price=None)
    oid = UUID(result["offering_id"])
    owners(settings, database, mt, pid, [owner])
    with pytest.raises(IdentityError, match="AVAILABILITY_PRICE_REQUIRED"):
        confirm(settings, database, mt, pid, oid)
    original = read_detail(database, mt, pid)["offerings"][0]
    run(
        settings,
        database,
        mt,
        "edit-offering",
        EditOffering(
            expected_property_version=3,
            expected_version=1,
            price_mad="0.01",
            price_period="year",
            state="draft",
            conditions="Annuel initial",
            reason="Prix connu",
        ),
        oid,
    )
    confirm(settings, database, mt, pid, oid)
    confirm(settings, database, mt, pid, oid)
    with pytest.raises(IdentityError, match="AVAILABILITY_OWNER_REQUIRED"):
        owners(settings, database, mt, pid, [])
    facts = read_detail(database, mt, pid)
    assert facts["offerings"][0]["annual_equivalent_mad"] == "0.01"
    run(
        settings,
        database,
        mt,
        "edit-offering",
        EditOffering(
            expected_property_version=facts["version"],
            expected_version=4,
            price_mad="0.01",
            price_period="year",
            state="withdrawn",
            conditions="Annuel initial",
            reason="Campagne terminée",
        ),
        oid,
    )
    owners(settings, database, mt, pid, [])
    replacement = offering_draft(settings, database, mt, pid, price="9999999999999999.99")
    assert replacement["offering_id"] != str(oid)
    assert (
        read_detail(database, mt, pid)["offerings"][0]["annual_equivalent_mad"]
        == "119999999999999999.88"
    )
    all_rows = read_list(database, mt, "offerings", InventoryQuery(property_id=pid))
    assert all_rows["total"] == 2
    assert (
        next(row for row in all_rows["items"] if row["id"] == str(oid))["conditions"]
        == "Annuel initial"
    )
    history = read_history(database, at, pid, InventoryQuery(page_size=100))["items"]
    confirmed = [row for row in history if row["action"] == "offerings.confirmed"]
    assert len(confirmed) == 2 and all(row["actor"]["id"] == str(uid) for row in confirmed)
    assert original["price_mad"] is None
    with database.session() as session, session.begin(), pytest.raises(IntegrityError):
        session.execute(update(InventoryEvent).values(reason="interdit"))


@pytest.mark.parametrize(
    "value", [0, 1.2, True, "0", "-1", "NaN", "1e2", "0.001", "10000000000000000"]
)
def test_decimal_wire_rejects_lossy_or_invalid_values(value):
    with pytest.raises(ValidationError):
        NewOffering(
            property_id=uuid4(),
            expected_property_version=1,
            kind="rental",
            price_mad=value,
            price_period="month",
        )


def test_versions_retries_denial_and_rollback(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    body = PropertyFields(reference="SP07-unique", category="land")
    key = uuid4()
    first = run(settings, database, mt, "create-property", body, key=key)
    assert run(settings, database, mt, "create-property", body, key=key) == first
    pid = UUID(first["property_id"])
    with pytest.raises(IdentityError, match="PROPERTY_REFERENCE_EXISTS"):
        property_draft(settings, database, mt, reference="sp07-unique")
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(
            settings,
            database,
            mt,
            "create-property",
            PropertyFields(reference="SP07-other", category="land"),
            key=key,
        )
    for operation, command_body, target in [
        ("owners", Owners(expected_version=1, owners=[]), pid),
        (
            "create-offering",
            NewOffering(property_id=pid, expected_property_version=1, kind="sale"),
            None,
        ),
        (
            "confirm-availability",
            ConfirmAvailability(
                expected_version=1, offering_id=uuid4(), expected_offering_version=1, reason="Test"
            ),
            pid,
        ),
        (
            "edit-offering",
            EditOffering(
                expected_property_version=1, expected_version=1, state="draft", reason="Test"
            ),
            uuid4(),
        ),
    ]:
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            run(settings, database, at, operation, command_body, target)
    edit = EditProperty(reference="SP07-modifié", category="land", expected_version=1)
    run(settings, database, mt, "edit-property", edit, pid)
    with pytest.raises(IdentityError, match="INVENTORY_VERSION_CONFLICT"):
        run(settings, database, mt, "edit-property", edit, pid)

    def interrupt(session, flush_context, instances):
        if any(isinstance(row, InventoryReceipt) for row in session.new):
            raise RuntimeError("SYNTHETIC_INTERRUPTION")

    event.listen(Session, "before_flush", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_INTERRUPTION"):
            property_draft(settings, database, mt, reference="SP07-rollback")
    finally:
        event.remove(Session, "before_flush", interrupt)
    assert read_list(database, mt, "properties", InventoryQuery(q="SP07-rollback"))["total"] == 0
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(InventoryReceipt)) == 2
        assert (
            session.scalar(
                select(func.count()).select_from(AuditEvent).where(AuditEvent.property_id == pid)
            )
            == 2
        )


def test_current_campaign_real_race_and_waiting_revocation(settings, database):
    manager, mt = actor(settings, database, "manager")
    pid = property_draft(settings, database, mt)
    body = NewOffering(property_id=pid, expected_property_version=1, kind="sale", price_mad="1.01")

    def attempt():
        try:
            run(settings, database, mt, "create-offering", body)
            return "ok"
        except IdentityError as error:
            return error.code

    with database.session() as lock, lock.begin(), ThreadPoolExecutor(2) as pool:
        lock.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        futures = [pool.submit(attempt) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        lock.commit()
        assert sorted(f.result() for f in futures) == ["INVENTORY_VERSION_CONFLICT", "ok"]
    with database.session() as lock, lock.begin(), ThreadPoolExecutor(2) as pool:
        lock.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        futures = [pool.submit(attempt) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        lock.execute(update(User).where(User.id == manager).values(role="agent", version=2))
        lock.commit()
        assert all(f.result() == "UNAUTHENTICATED" for f in futures)


def test_owner_merge_preserves_origin_and_invalidates_preview(settings, database):
    _, mt = actor(settings, database, "manager")
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+212600000002")))
    pid = property_draft(settings, database, mt)
    owners(settings, database, mt, pid, [source])
    planned = confirmation(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    owners(settings, database, mt, pid, [source, survivor])
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database,
            at,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            source,
            planned,
            "merge",
        )
    change(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    with database.session() as session:
        links = session.scalars(select(PropertyOwner).where(PropertyOwner.property_id == pid)).all()
        assert len(links) == 2
        old = next(row for row in links if row.origin_contact_id == source)
        assert old.archived_at is not None and old.contact_id == source
        assert len([row for row in links if row.archived_at is None]) == 1
    assert read_detail(database, mt, pid)["version"] == 4
    assert (
        read_history(database, at, pid, InventoryQuery())["items"][0]["action"]
        == "properties.owner-merged"
    )
