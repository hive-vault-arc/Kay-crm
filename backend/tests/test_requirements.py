"""SP-10 AT-07/08: real PostgreSQL, independent private searches and exact targets."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.models import ContactCollaborator
from app.contacts.ownership import mutate
from app.identity.models import AGENCY_ID, Agency
from app.identity.security import IdentityError, csrf_token
from app.inventory.contracts import InventoryQuery
from app.inventory.queries import read_list as inventory_list
from app.main import create_app
from app.requirements.commands import command
from app.requirements.contracts import (
    Criterion,
    EditRequirement,
    NewRequirement,
    RemoveShortlist,
    RequirementQuery,
    ShortlistChange,
)
from app.requirements.models import (
    Requirement,
    RequirementCriterion,
    RequirementReceipt,
    ShortlistEntry,
)
from app.requirements.queries import read_detail, read_list
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_foundation import client_for
from tests.test_inventory import offering_draft, property_draft
from tests.test_isolation_migrations import migrate
from tests.test_ownership import change, cid, confirmation, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def run(settings, database, token, body, rid=None, oid=None, key=None):
    return command(
        database, token, settings.facade_secret.get_secret_value(), key or uuid4(), body, rid, oid
    )


def new(contact, **values):
    return NewRequirement.model_validate(
        {
            "contact_id": str(contact),
            "title": "Recherche synthétique SP10",
            "intent": "rental",
            "budget_period": "month",
            "budget_max_mad": "11999.99",
            "criteria": [
                {"key": "area_sqm", "importance": "required", "value": None},
                {"key": "parking", "importance": "preferred", "value": False},
            ],
            **values,
        }
    )


def setup(settings, database):
    uid, token = actor(settings, database)
    contact = cid(create_lead(settings, database, token))
    return uid, token, contact


def test_independent_searches_unknown_false_and_exact_budgets(settings, database):
    _, token, contact = setup(settings, database)
    first = run(settings, database, token, new(contact))
    second = run(
        settings,
        database,
        token,
        new(contact, intent="sale", budget_period=None, title="Achat distinct"),
    )
    a, b = UUID(first["id"]), UUID(second["id"])
    before = read_detail(database, token, a)
    assert before["annual_budget_max_mad"] == "143999.88"
    assert before["budget_max_mad"] == "11999.99" and before["budget_period"] == "month"
    assert before["criteria"] == [
        {"key": "area_sqm", "importance": "required", "value": None},
        {"key": "parking", "importance": "preferred", "value": False},
    ]
    edited = EditRequirement.model_validate(
        {
            **new(contact, title="Nouvelle qualification").model_dump(exclude={"contact_id"}),
            "expected_version": 1,
        }
    )
    run(settings, database, token, edited, a)
    assert read_detail(database, token, b)["title"] == "Achat distinct"
    assert (
        read_list(database, token, RequirementQuery(contact_id=contact, page_size=1))["has_next"]
        is True
    )
    assert (
        len(
            read_list(database, token, RequirementQuery(contact_id=contact, page=2, page_size=1))[
                "items"
            ]
        )
        == 1
    )


@pytest.mark.parametrize(
    "key,value",
    [
        ("area_sqm", "0"),
        ("area_sqm", "NaN"),
        ("area_sqm", "1e2"),
        ("area_sqm", 12.34),
        ("rooms", 0),
        ("rooms", False),
        ("rooms", "3"),
        ("parking", "false"),
        ("elevator", 0),
        ("category", "type"),
        ("location", ""),
    ],
)
def test_invalid_typed_criteria(key, value):
    with pytest.raises(ValidationError):
        Criterion(key=key, importance="required", value=value)


@pytest.mark.parametrize(
    "values",
    [
        {"currency": "EUR"},
        {"budget_max_mad": "0"},
        {"budget_max_mad": "NaN"},
        {"budget_max_mad": 123.45},
        {"budget_min_mad": "12000"},
        {"budget_period": None},
        {"intent": "sale"},
        {"criteria": [{"key": "parking", "importance": "preferred", "value": None}] * 2},
    ],
)
def test_invalid_requirement_constraints(values):
    with pytest.raises(ValidationError):
        new(uuid4(), **values)


def test_real_offerings_shortlist_feedback_retry_and_immutable_terms(settings, database):
    _, token, contact = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    offer = offering_draft(settings, database, manager, pid, price="11999.99")
    oid = UUID(offer["offering_id"])
    rid = UUID(run(settings, database, token, new(contact))["id"])
    body = ShortlistChange(
        expected_version=1,
        offering_id=oid,
        expected_offering_version=1,
        feedback="À visiter, exemple synthétique",
    )
    key = uuid4()
    result = run(settings, database, token, body, rid, key=key)
    assert run(settings, database, token, body, rid, key=key) == result
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(ShortlistEntry)) == 1
    detail = read_detail(database, token, rid)
    selected = detail["shortlist"][0]
    assert selected["offering"]["id"] == str(oid)
    assert selected["offering"]["price_mad"] == "11999.99"
    assert selected["offering"]["price_period"] == "month"
    assert selected["offering"]["annual_equivalent_mad"] == "143999.88"
    assert selected["offering"]["conditions"] == "Conditions initiales synthétiques"
    assert selected["offering"]["target"]["id"] == str(pid)
    run(
        settings,
        database,
        token,
        ShortlistChange(
            **{**body.model_dump(), "expected_version": 2, "feedback": "Avis actualisé"}
        ),
        rid,
    )
    run(settings, database, token, RemoveShortlist(expected_version=3), rid, oid)
    assert read_detail(database, token, rid)["shortlist_count"] == 0
    with pytest.raises(IdentityError, match="OFFERING_INTENT_MISMATCH"):
        sale_id = UUID(
            run(settings, database, token, new(contact, intent="sale", budget_period=None))["id"]
        )
        run(settings, database, token, body, sale_id)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(
            settings,
            database,
            token,
            ShortlistChange(expected_version=4, offering_id=uuid4(), expected_offering_version=1),
            rid,
        )


def test_exact_annual_price_filters_and_safe_target_labels(settings, database):
    _, token = actor(settings, database, "manager")
    first = property_draft(settings, database, token, reference="SP10-MONTH")
    second = property_draft(settings, database, token, reference="SP10-YEAR")
    offering_draft(settings, database, token, first, price="11999.99")
    offering_draft(settings, database, token, second, price="143999.88", period="year")
    rows = inventory_list(
        database,
        token,
        "offerings",
        InventoryQuery(
            kind="rental",
            min_comparison_mad="143999.88",
            max_comparison_mad="143999.88",
            q="SP10-",
            target_level="standalone",
        ),
    )
    assert rows["total"] == 2
    assert {r["price_period"] for r in rows["items"]} == {"month", "year"}
    assert {r["annual_equivalent_mad"] for r in rows["items"]} == {"143999.88"}
    assert (
        inventory_list(
            database, token, "offerings", InventoryQuery(max_comparison_mad="143999.87")
        )["total"]
        == 0
    )
    assert all(
        set(r["target"])
        == {
            "id",
            "version",
            "development_version",
            "level",
            "reference",
            "label",
            "location",
            "category",
            "area_sqm",
            "rooms",
            "development_reference",
            "block_code",
            "floor_code",
            "unit_type_code",
            "archived",
        }
        for r in rows["items"]
    )


def test_current_private_scope_archive_merge_and_stale_preview(settings, database):
    uid, token, contact = setup(settings, database)
    _, outsider = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    rid = UUID(run(settings, database, token, new(contact))["id"])
    for call in (
        lambda: read_detail(database, outsider, rid),
        lambda: read_list(database, outsider, RequirementQuery(contact_id=contact)),
        lambda: run(settings, database, outsider, new(contact)),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            call()
    survivor = cid(create_lead(settings, database, token, new_lead("+212600000002")))
    confirmed = confirmation(
        settings,
        database,
        token,
        contact,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    run(settings, database, token, new(contact, title="Deuxième recherche"))
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            contact,
            confirmed,
            "merge",
        )
    change(
        settings,
        database,
        token,
        contact,
        intent("merge", survivor_id=str(survivor), survivor_expected_version=1),
    )
    with database.session() as session:
        row = session.get(Requirement, rid)
        assert row.contact_id == survivor and row.origin_contact_id == contact
        assert row.created_by_user_id == uid and row.version == 2
    assert read_list(database, token, RequirementQuery(contact_id=survivor))["total"] == 2
    change(settings, database, manager, survivor, intent("archive", 2))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, token, rid)
    assert read_detail(database, manager, rid)["id"] == str(rid)
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(settings, database, manager, new(survivor))


def test_conflict_race_and_single_effect_retry(settings, database):
    _, token, contact = setup(settings, database)
    body = new(contact)
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.engine.begin() as locked:
            locked.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            pending = [pool.submit(run, settings, database, token, body, key=key) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
        results = [p.result(5) for p in pending]
    assert results[0] == results[1]
    rid = UUID(results[0]["id"])
    edits = EditRequirement.model_validate(
        {**body.model_dump(exclude={"contact_id"}), "expected_version": 1}
    )

    def compete():
        try:
            run(settings, database, token, edits, rid)
            return "saved"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.engine.begin() as locked:
            locked.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            pending = [pool.submit(compete) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
        assert sorted(p.result(5) for p in pending) == ["REQUIREMENT_VERSION_CONFLICT", "saved"]


def test_permission_is_rechecked_after_wait(settings, database):
    _, owner, contact = setup(settings, database)
    uid, collaborator = actor(settings, database)
    with database.session() as session, session.begin():
        session.add(ContactCollaborator(contact_id=contact, user_id=uid))

    def compete():
        try:
            run(settings, database, collaborator, new(contact))
            return "unexpected"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.engine.begin() as locked:
            locked.execute(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            pending = [pool.submit(compete) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            locked.execute(
                update(ContactCollaborator)
                .where(
                    ContactCollaborator.contact_id == contact, ContactCollaborator.user_id == uid
                )
                .values(revoked_at=datetime.now(UTC))
            )
        assert [p.result(5) for p in pending] == ["NOT_FOUND", "NOT_FOUND"]
    assert read_list(database, owner, RequirementQuery(contact_id=contact))["total"] == 0


def test_interrupted_transaction_and_sql_guards(settings, database):
    _, token, contact = setup(settings, database)

    def interrupt(session):
        if any(isinstance(row, RequirementReceipt) for row in session.new):
            raise RuntimeError("SP10_BEFORE_COMMIT")

    event.listen(Session, "before_commit", interrupt)
    try:
        with pytest.raises(RuntimeError, match="SP10_BEFORE_COMMIT"):
            run(settings, database, token, new(contact))
    finally:
        event.remove(Session, "before_commit", interrupt)
    assert read_list(database, token, RequirementQuery(contact_id=contact))["total"] == 0
    rid = UUID(run(settings, database, token, new(contact))["id"])
    for column, value in (
        (Requirement.budget_max_mad, Decimal("NaN")),
        (Requirement.origin_contact_id, uuid4()),
    ):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(
                update(Requirement).where(Requirement.id == rid).values({column: value})
            )
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            update(RequirementCriterion)
            .where(
                RequirementCriterion.requirement_id == rid, RequirementCriterion.key == "area_sqm"
            )
            .values(value_number=Decimal("0"))
        )


@pytest.mark.anyio
async def test_http_auth_strict_queries_bodies_and_delete(settings, database):
    _, token, contact = setup(settings, database)
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": token,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.get(f"/api/v1/requirements?contact_id={contact}")).status_code == 403
        assert (
            await client.post(
                "/api/v1/requirements",
                json=new(contact).model_dump(mode="json"),
                headers={**headers, "X-CSRF-Token": "bad"},
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/requirements",
                json={**new(contact).model_dump(mode="json"), "owner": str(uuid4())},
                headers=headers,
            )
        ).status_code == 422
        assert (
            await client.get(
                f"/api/v1/requirements?contact_id={contact}&page=1&page=2", headers=headers
            )
        ).status_code == 422
        assert (
            await client.get(
                f"/api/v1/requirements?contact_id={contact}&unknown=x", headers=headers
            )
        ).status_code == 422
        result = await client.post(
            "/api/v1/requirements", json=new(contact).model_dump(mode="json"), headers=headers
        )
        assert result.status_code == 200
        assert result.headers["cache-control"] == "no-store"
        rid = result.json()["id"]
        assert (
            await client.get(f"/api/v1/requirements/{rid}?expand=private", headers=headers)
        ).status_code == 422
        assert (
            await client.request(
                "DELETE",
                f"/api/v1/requirements/{rid}/shortlist/{uuid4()}",
                json={"expected_version": 1},
                headers={**headers, "Idempotency-Key": str(uuid4())},
            )
        ).status_code == 404


def test_populated_migration_preservation_and_nonempty_downgrade_refusal(settings, database):
    from tests.legacy_support import contact as legacy_contact

    uid, token = actor(settings, database)
    assert migrate("downgrade", "0011_file_session_binding").returncode == 0
    try:
        contact = legacy_contact(database, uid)
        assert migrate("upgrade", "head").returncode == 0
        rid = UUID(run(settings, database, token, new(contact))["id"])
        assert migrate("downgrade", "0011_file_session_binding").returncode != 0
        assert read_detail(database, token, rid)["contact_id"] == str(contact)
    finally:
        assert migrate("upgrade", "head").returncode == 0


def test_large_exact_decimals_and_comparison_range(settings, database):
    _, token, contact = setup(settings, database)
    rid = UUID(
        run(settings, database, token, new(contact, budget_max_mad="9999999999999999.99"))["id"]
    )
    assert read_detail(database, token, rid)["annual_budget_max_mad"] == "119999999999999999.88"
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    offering_draft(settings, database, manager, pid, price="9999999999999999.99")
    exact = InventoryQuery(
        min_comparison_mad="119999999999999999.88", max_comparison_mad="119999999999999999.88"
    )
    assert inventory_list(database, token, "offerings", exact)["total"] == 1
    assert (
        inventory_list(
            database, token, "offerings", InventoryQuery(max_comparison_mad="119999999999999999.87")
        )["total"]
        == 0
    )
    with pytest.raises(ValidationError):
        InventoryQuery(min_comparison_mad="12000.00", max_comparison_mad="11999.99")


def test_shortlist_fk_uniqueness_intent_and_retained_campaign_history(settings, database):
    from app.inventory.contracts import EditOffering
    from app.inventory.queries import read_detail as property_read
    from tests.test_inventory import run as inventory_command

    _, token, contact = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    oid = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    rid = UUID(run(settings, database, token, new(contact))["id"])
    run(
        settings,
        database,
        token,
        ShortlistChange(expected_version=1, offering_id=oid, expected_offering_version=1),
        rid,
    )
    sale = UUID(
        run(settings, database, token, new(contact, intent="sale", budget_period=None))["id"]
    )
    for requirement, offering in ((rid, oid), (rid, uuid4()), (sale, oid)):
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.add(
                ShortlistEntry(
                    requirement_id=requirement,
                    offering_id=offering,
                    created_by_user_id=UUID(
                        read_detail(database, token, rid)["created_by_user_id"]
                    ),
                    updated_by_user_id=UUID(
                        read_detail(database, token, rid)["created_by_user_id"]
                    ),
                )
            )
    target = property_read(database, manager, pid)
    original = target["offerings"][0]
    inventory_command(
        settings,
        database,
        manager,
        "edit-offering",
        EditOffering(
            expected_property_version=target["version"],
            expected_version=original["version"],
            state="withdrawn",
            reason="Fin synthétique de la campagne",
            price_mad=original["price_mad"],
            currency="MAD",
            price_period=original["price_period"],
            conditions=original["conditions"],
        ),
        oid,
    )
    replacement = offering_draft(settings, database, manager, pid, price="24000.00", period="year")
    retained = read_detail(database, token, rid)["shortlist"][0]["offering"]
    assert retained["id"] == str(oid) and retained["id"] != replacement["offering_id"]
    assert retained["state"] == "withdrawn" and retained["price_period"] == "month"
    assert (
        retained["price_mad"] == original["price_mad"]
        and retained["conditions"] == original["conditions"]
    )


def test_receipt_replay_and_reads_recheck_transferred_contact_scope(settings, database):
    uid, token, contact = setup(settings, database)
    new_owner, second = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    key = uuid4()
    body = new(contact)
    rid = UUID(run(settings, database, token, body, key=key)["id"])
    change(settings, database, manager, contact, intent("assign", primary_agent_id=str(new_owner)))
    for call in (
        lambda: run(settings, database, token, body, key=key),
        lambda: read_detail(database, token, rid),
        lambda: run(settings, database, token, RemoveShortlist(expected_version=1), rid, uuid4()),
    ):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            call()
    assert read_list(database, second, RequirementQuery(contact_id=contact))["total"] == 1
    assert read_detail(database, second, rid)["created_by_user_id"] == str(uid)
