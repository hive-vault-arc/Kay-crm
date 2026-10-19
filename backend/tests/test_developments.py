"""SP-08 scoped AT-27/31/32/35/36/41 against isolated PostgreSQL."""

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import delete, event, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from app.inventory.contracts import (
    ConfirmAvailability,
    EditOffering,
    EditProperty,
    InventoryQuery,
    NewOffering,
    Owners,
    PropertyFields,
)
from app.inventory.hierarchy_contracts import (
    ArchiveDevelopment,
    DevelopmentFields,
    EditDevelopment,
    StructureFields,
    TypeFields,
)
from app.inventory.hierarchy_models import Block, Development, DevelopmentOwner, Floor, UnitType
from app.inventory.hierarchy_queries import read_hierarchy
from app.inventory.models import InventoryEvent, InventoryReceipt, Offering, Property
from app.inventory.queries import read_detail, read_list
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_inventory import run
from tests.test_ownership import change, cid, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def read(database, token, operation="detail", target=None, **query):
    return read_hierarchy(database, token, operation, target, InventoryQuery(**query))


def development(settings, database, token, **fields):
    result = run(
        settings,
        database,
        token,
        "create-development",
        DevelopmentFields(reference=f"SP08-{uuid4().hex}", name="Programme synthétique", **fields),
    )
    return UUID(result["development_id"])


def structure(settings, database, token, did, operation, target=None, code="B1", **fields):
    version = read(database, token, target=did)["version"]
    if operation.endswith("type"):
        body = TypeFields(
            expected_version=version,
            development_id=did,
            code=code,
            label=code,
            category="apartment",
            **fields,
        )
    else:
        body = StructureFields(expected_version=version, code=code, label=code, **fields)
    return run(settings, database, token, operation, body, target or did)


def hierarchy(settings, database, token, did):
    structure(settings, database, token, did, "create-block")
    bid = UUID(read(database, token, "blocks", did)["items"][0]["id"])
    structure(settings, database, token, did, "create-floor", bid, "F2")
    structure(settings, database, token, did, "create-floor", bid, "F3")
    floors = [UUID(row["id"]) for row in read(database, token, "floors", bid)["items"]]
    structure(
        settings,
        database,
        token,
        did,
        "create-type",
        code="T2",
        default_area_sqm="80.00",
        default_rooms=2,
    )
    tid = UUID(read(database, token, "unit-types", did)["items"][0]["id"])
    return bid, floors, tid


def unit(settings, database, token, did, fid=None, tid=None, category="apartment", area="80.00"):
    result = run(
        settings,
        database,
        token,
        "create-property",
        PropertyFields(
            reference=f"SP08-U-{uuid4().hex}",
            category=category,
            development_id=did,
            floor_id=fid,
            unit_type_id=tid,
            area_sqm=area,
        ),
    )
    return UUID(result["property_id"])


def campaign(settings, database, token, did, price="25000000.01", kind="sale"):
    return run(
        settings,
        database,
        token,
        "create-offering",
        NewOffering(
            development_id=did,
            expected_development_version=read(database, token, target=did)["version"],
            kind=kind,
            price_mad=price,
            price_period="month" if kind == "rental" else None,
        ),
    )


def confirm(settings, database, token, did, oid):
    value = read(database, token, target=did)
    offering = next(row for row in value["offerings"] if row["id"] == str(oid))
    return run(
        settings,
        database,
        token,
        "development-confirm",
        ConfirmAvailability(
            expected_version=value["version"],
            offering_id=oid,
            expected_offering_version=offering["version"],
            reason="Vérification synthétique",
        ),
        did,
    )


def test_mixed_categories_scoped_pages_reuse_and_independent_facts(settings, database):
    _, token = actor(settings, database, "manager")
    did = development(settings, database, token)
    bid, floors, tid = hierarchy(settings, database, token, did)
    ids = [unit(settings, database, token, did, floor, tid) for floor in floors]
    for category in ("villa", "house", "land", "commercial"):
        unit(settings, database, token, did, category=category)
    structure(settings, database, token, did, "create-block", code="B2")
    assert read(database, token, "blocks", did)["total"] == 2
    all_units = read(database, token, "inventory", did)
    assert all_units["total"] == 6 and all_units["development"]["unit_count"] == 6
    filtered = read(database, token, "inventory", did, unit_type_id=tid, block_id=bid, page_size=1)
    assert filtered["total"] == 2 and filtered["has_next"] and len(filtered["items"]) == 1
    assert read(database, token, "inventory", did, floor_id=floors[0])["total"] == 1
    structure(
        settings,
        database,
        token,
        did,
        "edit-type",
        tid,
        "T2",
        default_area_sqm="95.00",
        default_rooms=3,
    )
    assert [read_detail(database, token, pid)["area_sqm"] for pid in ids] == ["80.00", "80.00"]
    assert read(database, token, "inventory", did, category="land")["items"][0]["floor_id"] is None
    assert (
        read(database, token, "inventory", did, category="commercial")["items"][0]["floor_id"]
        is None
    )
    assert (
        read_list(database, token, "properties", InventoryQuery(target_level="standalone"))["total"]
        == 0
    )
    assert (
        read_list(database, token, "properties", InventoryQuery(target_level="unit", block_id=bid))[
            "total"
        ]
        == 2
    )


def test_commercial_development_type_and_direct_unit(settings, database):
    _, token = actor(settings, database, "manager")
    did = development(settings, database, token, category="commercial")
    run(
        settings,
        database,
        token,
        "create-type",
        TypeFields(
            expected_version=read(database, token, target=did)["version"],
            development_id=did,
            code="LOCAL",
            label="Local synthétique",
            category="commercial",
        ),
        did,
    )
    tid = UUID(read(database, token, "unit-types", did)["items"][0]["id"])
    pid = unit(settings, database, token, did, tid=tid, category="commercial")
    assert read(database, token, target=did)["category"] == "commercial"
    assert read_detail(database, token, pid)["category"] == "commercial"
    assert read(database, token, "inventory", did, category="commercial")["total"] == 1


def test_incomplete_apartment_project_whole_target_ownership_and_optional_briefing(
    settings, database
):
    _, token = actor(settings, database, "manager")
    _, at = actor(settings, database)
    _, unrelated = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    did = development(
        settings,
        database,
        token,
        category="apartment",
        developer_contact_id=owner,
        developer_marketing_display="Promoteur autorisé",
    )
    created = campaign(settings, database, token, did)
    oid = UUID(created["offering_id"])
    with pytest.raises(IdentityError, match="AVAILABILITY_OWNER_REQUIRED"):
        confirm(settings, database, token, did, oid)
    run(
        settings,
        database,
        token,
        "development-owners",
        Owners(
            expected_version=2,
            owners=[{"contact_id": owner, "marketing_display": "Vendeur autorisé"}],
        ),
        did,
    )
    with pytest.raises(IdentityError, match="DEVELOPMENT_UNITS_REQUIRED"):
        confirm(settings, database, token, did, oid)
    _, floors, tid = hierarchy(settings, database, token, did)
    pid = unit(settings, database, token, did, floors[0], tid)
    confirm(settings, database, token, did, oid)
    before = read_detail(database, token, pid)
    for briefing in ("<script>synthetic()</script>\nPrésentation partagée", "", None):
        value = read(database, token, target=did)
        run(
            settings,
            database,
            token,
            "development-edit",
            EditDevelopment(
                reference=value["reference"],
                name=value["name"],
                category="apartment",
                developer_contact_id=owner,
                developer_marketing_display="Promoteur autorisé",
                briefing_text=briefing,
                expected_version=value["version"],
            ),
            did,
        )
        safe = read(database, unrelated, target=did)
        assert safe["developer"] == {"marketing_display": "Promoteur autorisé", "contact": None}
        assert safe["owners"] == [{"marketing_display": "Vendeur autorisé", "contact": None}]
        assert str(owner) not in str(safe) and "phone" not in str(safe)
        assert safe["briefing_text"] == (briefing or None)
        assert safe["offerings"][0]["state"] == "available"
        assert read_detail(database, token, pid) == before
    assert read(database, at, target=did)["developer"]["contact"]["id"] == str(owner)
    assert (
        read_list(database, unrelated, "offerings", InventoryQuery(target_level="development"))[
            "total"
        ]
        == 1
    )
    with pytest.raises(IdentityError, match="AVAILABILITY_OWNER_REQUIRED"):
        run(
            settings,
            database,
            token,
            "development-owners",
            Owners(expected_version=safe["version"], owners=[]),
            did,
        )
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(
            settings,
            database,
            token,
            "development-archive",
            ArchiveDevelopment(expected_version=safe["version"], reason="Synthétique"),
            did,
        )


def test_invalid_hierarchy_targets_and_referenced_reparenting(settings, database):
    _, token = actor(settings, database, "manager")
    did = development(settings, database, token)
    other = development(settings, database, token)
    bid, floors, tid = hierarchy(settings, database, token, did)
    _, other_floors, other_type = hierarchy(settings, database, token, other)
    for development_id, fid, type_id in (
        (did, None, tid),
        (did, floors[0], None),
        (other, floors[0], tid),
        (did, other_floors[0], tid),
        (did, floors[0], other_type),
    ):
        with pytest.raises(IdentityError, match="INVALID_HIERARCHY"):
            unit(settings, database, token, development_id, fid, type_id)
    pid = unit(settings, database, token, did, floors[0], tid)
    run(
        settings,
        database,
        token,
        "create-offering",
        NewOffering(property_id=pid, expected_property_version=1, kind="sale", price_mad="1.01"),
    )
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(
            settings,
            database,
            token,
            "edit-property",
            EditProperty(
                reference="SP08-reparent", category="land", development_id=other, expected_version=2
            ),
            pid,
        )
    for model, target, values in (
        (Property, pid, {"development_id": other}),
        (Floor, floors[0], {"block_id": uuid4()}),
        (Block, bid, {"development_id": other}),
        (UnitType, tid, {"category": "land"}),
    ):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(update(model).where(model.id == target).values(**values))
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(delete(Development).where(Development.id == did))
    with pytest.raises(ValidationError):
        NewOffering(property_id=pid, development_id=did, expected_property_version=1, kind="sale")
    for extra in ({"block_id": bid}, {"unit_type_id": tid}, {"floor_id": floors[0]}):
        with pytest.raises(ValidationError):
            NewOffering(expected_development_version=1, development_id=did, kind="sale", **extra)


def test_versions_retries_roles_interruptions_and_real_races(settings, database):
    uid, token = actor(settings, database, "manager")
    _, at = actor(settings, database)
    did = development(settings, database, token)
    body = StructureFields(expected_version=1, code="B1", label="Bloc synthétique")
    key = uuid4()
    first = run(settings, database, token, "create-block", body, did, key)
    assert run(settings, database, token, "create-block", body, did, key) == first
    with pytest.raises(IdentityError, match="INVENTORY_VERSION_CONFLICT"):
        run(settings, database, at, "create-block", body, did)
    with pytest.raises(IdentityError, match="INVENTORY_VERSION_CONFLICT"):
        run(settings, database, token, "create-block", body, did)

    def interrupt(session, flush_context, instances):
        if any(isinstance(row, InventoryReceipt) for row in session.new):
            raise RuntimeError("SP08_INTERRUPTED")

    event.listen(Session, "before_flush", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SP08_INTERRUPTED"):
            structure(settings, database, token, did, "create-block", code="B2")
    finally:
        event.remove(Session, "before_flush", interrupt)
    assert read(database, token, "blocks", did)["total"] == 1
    assert read(database, token, target=did)["version"] == 2
    body2 = StructureFields(expected_version=2, code="B2", label="Bloc 2")

    def attempt():
        try:
            run(settings, database, token, "create-block", body2, did)
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
        lock.execute(update(User).where(User.id == uid).values(role="agent", version=2))
        lock.commit()
        assert all(f.result() == "UNAUTHENTICATED" for f in futures)


def test_developer_and_legal_owner_merge_preserve_origin_without_scope_union(settings, database):
    _, token = actor(settings, database, "manager")
    _, at = actor(settings, database)
    source = cid(create_lead(settings, database, at))
    survivor = cid(create_lead(settings, database, at, new_lead("+212600000002")))
    did = development(settings, database, token, developer_contact_id=source)
    run(
        settings,
        database,
        token,
        "development-owners",
        Owners(
            expected_version=1,
            owners=[
                {"contact_id": source},
                {"contact_id": survivor, "marketing_display": "Affichage conservé"},
            ],
        ),
        did,
    )
    change(
        settings,
        database,
        at,
        source,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    safe = read(database, token, target=did)
    assert safe["version"] == 3 and safe["developer"]["contact"]["id"] == str(survivor)
    assert safe["owners"][0]["marketing_display"] == "Affichage conservé"
    with database.session() as session:
        old = session.scalar(
            select(DevelopmentOwner).where(DevelopmentOwner.origin_contact_id == source)
        )
        assert old.archived_at is not None and old.contact_id == source
        assert (
            session.scalar(
                select(func.count())
                .select_from(InventoryEvent)
                .where(InventoryEvent.development_id == did)
            )
            == 3
        )


@pytest.mark.parametrize("briefing", ["x" * 10001, "😀" * 10001], ids=["ascii", "unicode"])
def test_briefing_unicode_bound(briefing):
    with pytest.raises(ValidationError):
        DevelopmentFields(reference="SP08-bound", name="Programme", briefing_text=briefing)


def test_sql_target_xor_and_template_finite_check(settings, database):
    uid, token = actor(settings, database, "manager")
    did = development(settings, database, token)
    for ids in ({}, {"property_id": uuid4(), "development_id": did}):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.add(Offering(kind="sale", created_by_user_id=uid, **ids))
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.add(
            UnitType(
                development_id=did,
                code="NAN",
                label="Synthétique",
                category="apartment",
                default_area_sqm=Decimal("NaN"),
            )
        )


def test_empty_archive_restore_unknown_price_and_multiple_owners(settings, database):
    _, token = actor(settings, database, "manager")
    _, at = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    other_owner = cid(create_lead(settings, database, at, new_lead("+212600000002")))
    did = development(settings, database, token)
    archived = run(
        settings,
        database,
        token,
        "development-archive",
        ArchiveDevelopment(expected_version=1, reason="Archive synthétique vide"),
        did,
    )
    assert read(database, token, "developments")["total"] == 0
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        campaign(settings, database, token, did)
    run(
        settings,
        database,
        token,
        "development-restore",
        ArchiveDevelopment(expected_version=archived["version"], reason="Restauration synthétique"),
        did,
    )
    assert read(database, token, "developments")["total"] == 1
    created = campaign(settings, database, token, did, price=None, kind="rental")
    oid = UUID(created["offering_id"])
    value = read(database, token, target=did)
    run(
        settings,
        database,
        token,
        "development-owners",
        Owners(
            expected_version=value["version"],
            owners=[{"contact_id": owner}, {"contact_id": other_owner}],
        ),
        did,
    )
    with pytest.raises(IdentityError, match="AVAILABILITY_PRICE_REQUIRED"):
        confirm(settings, database, token, did, oid)
    assert len(read(database, token, target=did)["owners"]) == 2
    structure(settings, database, token, did, "create-block")
    with pytest.raises(IdentityError, match="HIERARCHY_CODE_EXISTS"):
        structure(settings, database, token, did, "create-block")


def test_whole_rental_terms_withdrawal_replacement_and_immutable_target(settings, database):
    _, token = actor(settings, database, "manager")
    _, at = actor(settings, database)
    owner = cid(create_lead(settings, database, at))
    did = development(settings, database, token)
    created = campaign(settings, database, token, did, price="11999.99", kind="rental")
    oid = UUID(created["offering_id"])
    run(
        settings,
        database,
        token,
        "development-owners",
        Owners(expected_version=2, owners=[{"contact_id": owner}]),
        did,
    )
    confirm(settings, database, token, did, oid)
    current = read(database, token, target=did)
    assert current["offerings"][0]["annual_equivalent_mad"] == "143999.88"
    for state in ("available", "withdrawn"):
        value = read(database, token, target=did)
        offering = value["offerings"][0]
        run(
            settings,
            database,
            token,
            "edit-offering",
            EditOffering(
                expected_development_version=value["version"],
                expected_version=offering["version"],
                price_mad="12345.67",
                price_period="year",
                state=state,
                conditions="Conditions annuelles du programme entier",
                reason="Conditions synthétiques vérifiées",
            ),
            oid,
        )
        if state == "available":
            assert (
                read(database, token, target=did)["offerings"][0]["annual_equivalent_mad"]
                == "12345.67"
            )
            pid = unit(settings, database, token, did, category="land")
            with (
                pytest.raises(IntegrityError, match="STOCK_REVIEW_REQUIRED"),
                database.session() as session,
                session.begin(),
            ):
                session.execute(
                    update(Offering)
                    .where(Offering.id == oid)
                    .values(property_id=pid, development_id=None)
                )
    replacement = campaign(settings, database, token, did, price=None, kind="rental")
    assert replacement["offering_id"] != str(oid)
    campaigns = read_list(database, token, "offerings", InventoryQuery(development_id=did))
    assert campaigns["total"] == 2
    assert next(row for row in campaigns["items"] if row["id"] == str(oid))["is_current"] is False
    events = read(database, at, "history", did)["items"]
    assert len([row for row in events if row["action"] == "offerings.confirmed"]) == 1
    assert (
        next(row for row in events if row["action"] == "offerings.withdrawn")["conditions"]
        == "Conditions annuelles du programme entier"
    )
