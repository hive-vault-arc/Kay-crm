"""SP-11 hostile wire/SQL boundaries and preserved real target identities."""

from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError

from app.deals.contracts import ChildQuery, DealQuery, EditCustomerOffer
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal
from app.deals.queries import read_children, read_detail, read_list
from app.identity.security import IdentityError, csrf_token
from app.inventory.models import Offering
from app.main import create_app
from app.requirements.contracts import NewRequirement
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import edit, new, offer, run, setup
from tests.test_developments import campaign, development, hierarchy, unit
from tests.test_foundation import client_for
from tests.test_inventory import offering_draft
from tests.test_ownership import cid
from tests.test_requirements import run as requirement_command

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize(
    "values",
    [
        {"amount_mad": "0"},
        {"amount_mad": "-1"},
        {"amount_mad": "NaN"},
        {"amount_mad": "Infinity"},
        {"amount_mad": "1e2"},
        {"amount_mad": 12.34},
        {"amount_mad": "1.001"},
        {"amount_mad": "10000000000000000"},
        {"currency": "EUR"},
        {"price_period": "week"},
        {"status": "won"},
        {"expected_version": True},
        {"expires_on": "not-a-date"},
        {"conditions": "x" * 4001},
    ],
    ids=[
        "zero",
        "negative",
        "nan",
        "infinite",
        "exponent",
        "float",
        "scale",
        "overflow",
        "currency",
        "period",
        "status",
        "bool-version",
        "date",
        "conditions",
    ],
)
def test_customer_offer_rejects_invalid_money_types_and_fields(values):
    with pytest.raises(ValidationError):
        offer(**values)


def test_same_contact_requirement_enquiry_and_offer_kind_are_authoritative(settings, database):
    _, token, contact, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    other = cid(create_lead(settings, database, outsider, new_lead("+212600000002")))
    req = UUID(
        requirement_command(
            settings,
            database,
            outsider,
            NewRequirement(contact_id=other, title="Recherche privée", intent="sale"),
        )["id"]
    )
    for values in (
        {"requirement_id": str(req)},
        {"requirement_id": str(uuid4())},
        {"enquiry_id": str(uuid4())},
    ):
        with pytest.raises(IdentityError, match="INVALID_DEAL_CONTEXT"):
            run(settings, database, token, new(contact, **values))
    assert read_list(database, token, DealQuery())["total"] == 0


def test_unit_whole_targets_template_rejection_and_historical_selection(settings, database):
    _, token, contact, _ = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    project = development(settings, database, manager)
    _, floors, template = hierarchy(settings, database, manager, project)
    physical = unit(settings, database, manager, project, floors[0], template)
    actual = UUID(offering_draft(settings, database, manager, physical)["offering_id"])
    whole = UUID(campaign(settings, database, manager, project, kind="rental")["offering_id"])
    did = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(actual), expected_offering_version=1),
        )["id"]
    )
    assert read_detail(database, token, did)["offering"]["target"]["level"] == "unit"
    from app.inventory.contracts import InventoryQuery
    from app.inventory.selection import select_offerings

    with database.session() as session:
        matched = select_offerings(
            session, InventoryQuery(offering_id=actual), lambda o: {"id": str(o.id)}
        )
        assert matched["total"] == 1 and matched["items"][0]["id"] == str(actual)
    run(settings, database, token, edit(offering_id=str(whole), expected_offering_version=1), did)
    row = read_detail(database, token, did)
    assert row["offering"]["target"]["level"] == "development"
    history = read_children(database, token, did, "history", ChildQuery())["items"]
    assert {h["offering_id"] for h in history} == {str(actual), str(whole)}
    assert {h["target"]["level"] for h in history} == {"unit", "development"}
    assert "developer_contact_id" not in row["offering"]["target"]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(template), expected_offering_version=1),
        )
    with pytest.raises(IdentityError, match="OFFERING_VERSION_CONFLICT"):
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(whole), expected_offering_version=99),
        )
    with pytest.raises(IdentityError, match="DEAL_OFFER_PERIOD_MISMATCH"):
        run(settings, database, token, offer(version=2, price_period=None), did)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            update(Offering)
            .where(Offering.id == actual)
            .values(development_id=project, property_id=None)
        )


def test_sql_identity_history_money_and_context_guards(settings, database):
    _, token, contact, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(contact))["id"])
    result = run(settings, database, token, offer(), did)
    oid = UUID(result["customer_offer_id"])
    mutations = [
        update(Deal).where(Deal.id == did).values(stage="won"),
        update(Deal).where(Deal.id == did).values(stage="reserved"),
        update(Deal).where(Deal.id == did).values(origin_contact_id=uuid4()),
        update(Deal).where(Deal.id == did).values(title="Sans historique"),
        delete(Deal).where(Deal.id == did),
        update(DealStageEvent).where(DealStageEvent.deal_id == did).values(reason="Falsification"),
        update(CustomerOffer).where(CustomerOffer.id == oid).values(amount_mad=Decimal("NaN")),
        update(CustomerOffer).where(CustomerOffer.id == oid).values(amount_mad=Decimal("0")),
        update(CustomerOffer).where(CustomerOffer.id == oid).values(status="accepted"),
        delete(CustomerOffer).where(CustomerOffer.id == oid),
    ]
    for mutation in mutations:
        with pytest.raises(IntegrityError), database.session() as session, session.begin():
            session.execute(mutation)
    assert read_detail(database, token, did)["stage"] == "new"
    assert (
        read_children(database, token, did, "customer-offers", ChildQuery())["items"][0]["status"]
        == "pending"
    )


def test_copied_customer_offer_ids_and_versions_do_not_grant_access(settings, database):
    _, owner, contact, _ = setup(settings, database)
    _, stranger = actor(settings, database)
    did = UUID(run(settings, database, owner, new(contact))["id"])
    oid = UUID(run(settings, database, owner, offer(), did)["customer_offer_id"])
    body = EditCustomerOffer.model_validate(
        {
            **offer().model_dump(exclude={"expected_version"}),
            "expected_version": 1,
            "expected_deal_version": 2,
            "status": "accepted",
        }
    )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, stranger, body, oid=oid)
    run(settings, database, owner, body, oid=oid)
    with pytest.raises(IdentityError, match="DEAL_VERSION_CONFLICT"):
        run(settings, database, owner, body, oid=oid)
    assert read_detail(database, owner, did)["stage"] == "new"


@pytest.mark.anyio
async def test_http_strict_auth_bodies_queries_and_future_command_guards(settings, database):
    _, token, contact, _ = setup(settings, database)
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": token,
        "Origin": settings.frontend_origin,
        "X-CSRF-Token": csrf_token(secret, token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.get("/api/v1/deals")).status_code == 403
        assert (
            await client.post(
                "/api/v1/deals",
                headers={**headers, "X-CSRF-Token": "bad"},
                json=new(contact).model_dump(mode="json"),
            )
        ).status_code == 403
        for extra in (
            {"primary_agent_id": str(uuid4())},
            {"stage": "won"},
            {"agreed_amount_mad": "1"},
        ):
            assert (
                await client.post(
                    "/api/v1/deals",
                    headers=headers,
                    json={**new(contact).model_dump(mode="json"), **extra},
                )
            ).status_code == 422
        for query in (
            "page=1&page=2",
            "private_owner=x",
            "updated_from=2026-10-15&updated_to=2026-01-01",
        ):
            assert (await client.get(f"/api/v1/deals?{query}", headers=headers)).status_code == 422
        assert (
            await client.get("/api/v1/deals?updated_to=9999-12-31", headers=headers)
        ).status_code == 200
        created = await client.post(
            "/api/v1/deals", headers=headers, json=new(contact).model_dump(mode="json")
        )
        assert created.status_code == 200 and created.headers["cache-control"] == "no-store"
        did = created.json()["id"]
        for path, body in (
            (f"deals/{did}", {"expected_version": 1, "stage": "won"}),
            (
                f"deals/{did}/transition",
                {"expected_version": 1, "stage": "reserved", "reason": "Pas une réservation"},
            ),
        ):
            method = client.patch if path.endswith(did) else client.post
            assert (await method(f"/api/v1/{path}", headers=headers, json=body)).status_code == 422
        for action, expected_status in (
            ("unimplemented-future-command", 404),
            ("close", 422),
            ("reopen", 422),
        ):
            assert (
                await client.post(
                    f"/api/v1/deals/{did}/{action}", headers=headers, json={"expected_version": 1}
                )
            ).status_code == expected_status
        assert (
            await client.patch(f"/api/v1/deals/{did}", headers=headers, content=b"x" * 32769)
        ).status_code == 413
        assert (
            await client.get(f"/api/v1/deals/{did}?expand=finance", headers=headers)
        ).status_code == 422
