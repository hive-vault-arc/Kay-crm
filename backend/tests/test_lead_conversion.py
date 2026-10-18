"""Real isolated transactions prove conversion rather than free-title deal creation."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.contracts import ListQuery
from app.contacts.models import Contact, Enquiry
from app.contacts.queries import read_detail as lead_detail
from app.contacts.queries import read_list as leads
from app.deals.contracts import ChildQuery, ConvertLead
from app.deals.models import Deal
from app.deals.project_models import DealProject
from app.deals.queries import read_children, read_detail
from app.identity.security import IdentityError
from app.reports.contracts import PeriodQuery
from app.reports.queries import dashboard
from tests.contact_support import actor, create_lead
from tests.deal_support import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def conversion(version=1, **values):
    return ConvertLead.model_validate(
        {
            "expected_version": version,
            "project": {"external_name": "Projet synthétique"},
            "initial_budget": "1000000",
            "purchase_reasons": ["residence", "investment"],
            **values,
        }
    )


def test_conversion_inherits_profile_and_qualifies_a_real_deal(settings, database):
    uid, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid, key = UUID(lead["id"]), uuid4()
    before = {
        metric["key"]: metric["total"]
        for metric in dashboard(database, token, PeriodQuery())["metrics"]
    }
    assert before["contacts"] == before["enquiries"] == 1 and before["active_deals"] == 0
    body = conversion()
    result = run(settings, database, token, body, eid, key=key)
    assert run(settings, database, token, body, eid, key=key) == result
    deal = read_detail(database, token, UUID(result["id"]))
    updated = lead_detail(database, token, "enquiries", eid)
    assert updated["status"] == "converted" and updated["version"] == 2
    assert updated["converted_deal_id"] == deal["id"] and updated["converted_at"]
    after = {
        metric["key"]: metric["total"]
        for metric in dashboard(database, token, PeriodQuery())["metrics"]
    }
    assert after["contacts"] == before["contacts"]
    assert after["enquiries"] == before["enquiries"]
    assert after["active_deals"] == 1
    assert deal["contact"]["id"] == lead["contact"]["id"]
    assert deal["contact"]["primary_agent"]["id"] == str(uid)
    assert deal["client_snapshot"]["languages"] == ["french", "darija"]
    assert deal["client_snapshot"]["country"] == "MA"
    assert deal["client_snapshot"]["calling_code"] == "+212"
    assert deal["initial_budget"] == "1000000.00 MAD"
    assert deal["purchase_reasons"] == ["residence", "investment"]
    assert deal["campaign_source"] == "facebook"
    assert deal["notes"] == lead["message"]
    assert deal["projects"][0]["external_name"] == "Projet synthétique"
    assert deal["title"] == f"{lead['contact']['name']} · Projet synthétique"
    assert deal["offering"] is None and deal["active_reservation"] is None
    remaining = leads(database, token, "enquiries", ListQuery())
    assert remaining["total"] == 0 and sum(remaining["status_counts"].values()) == 0
    converted = leads(database, token, "enquiries", ListQuery(status="converted"))
    assert converted["total"] == converted["status_counts"]["converted"] == 1
    assert sum(converted["status_counts"].values()) == 1
    history = read_children(database, token, UUID(deal["id"]), "history", ChildQuery())
    assert history["items"][0]["qualification"]["projects"] == deal["projects"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Contact)) == 1
        assert session.scalar(select(func.count()).select_from(Deal)) == 1


def test_duplicate_stale_and_invalid_project_leave_conversion_unchanged(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    with pytest.raises(IdentityError, match="PROJECT_UNAVAILABLE"):
        run(settings, database, token, conversion(project={"development_id": str(uuid4())}), eid)
    assert lead_detail(database, token, "enquiries", eid)["version"] == 1
    run(settings, database, token, conversion(), eid)
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        run(settings, database, token, conversion(), eid)
    with pytest.raises(IdentityError, match="LEAD_ALREADY_CONVERTED"):
        run(settings, database, token, conversion(2), eid)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Deal)) == 1


def test_private_and_archived_lead_conversion_is_denied(settings, database):
    _, token = actor(settings, database)
    _, outsider = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, outsider, conversion(), eid)
    with database.session() as session, session.begin():
        contact = session.get(Contact, UUID(lead["contact"]["id"]))
        from datetime import UTC, datetime

        contact.archived_at = datetime.now(UTC)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, conversion(), eid)


def test_concurrent_conversion_creates_one_deal(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])

    def attempt():
        try:
            return run(settings, database, token, conversion(), eid)["id"]
        except IdentityError as error:
            return str(error)

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: attempt(), range(2)))
    assert sum(value == "VERSION_CONFLICT" for value in results) == 1
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Deal)) == 1


def test_conversion_receipt_failure_rolls_back_lead_deal_and_projects(settings, database):
    from app.deals.models import DealReceipt

    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])

    def fail(session, *_):
        if any(isinstance(value, DealReceipt) for value in session.new):
            raise RuntimeError("SYNTHETIC_RECEIPT_FAILURE")

    event.listen(Session, "before_flush", fail)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_RECEIPT_FAILURE"):
            run(settings, database, token, conversion(), eid)
    finally:
        event.remove(Session, "before_flush", fail)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Deal)) == 0
        assert session.scalar(select(func.count()).select_from(DealProject)) == 0
        assert session.get(Enquiry, eid).status == "new"


def test_database_refuses_detaching_a_converted_lead(settings, database):
    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    run(settings, database, token, conversion(), eid)
    with pytest.raises(IntegrityError, match="LEAD_CONVERSION_IDENTITY"):
        with database.session() as session, session.begin():
            session.execute(
                text(
                    "UPDATE enquiry SET status='closed', converted_deal_id=NULL, "
                    "converted_at=NULL WHERE id=:id"
                ),
                {"id": eid},
            )


def test_existing_project_interest_does_not_reserve_inventory(settings, database):
    from app.inventory.hierarchy_models import Development
    from tests.test_developments import development

    _, token = actor(settings, database)
    pid = development(settings, database, token)
    eid = UUID(create_lead(settings, database, token)["id"])
    result = run(settings, database, token, conversion(project={"development_id": str(pid)}), eid)
    deal = read_detail(database, token, UUID(result["id"]))
    assert deal["projects"][0]["development_id"] == str(pid)
    assert deal["offering"] is None and deal["active_reservation"] is None
    with database.session() as session:
        assert session.get(Development, pid).version == 1


@pytest.mark.anyio
async def test_metadata_and_conversion_use_existing_http_authority(settings, database):
    from app.identity.security import csrf_token
    from app.main import create_app
    from tests.test_auth import authority
    from tests.test_foundation import client_for

    _, token = actor(settings, database)
    eid = UUID(create_lead(settings, database, token)["id"])
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        assert (await client.get("/api/v1/contacts/metadata")).status_code == 403
        metadata = await client.get("/api/v1/contacts/metadata", headers=headers)
        assert metadata.status_code == 200 and len(metadata.json()["campaign_sources"]) == 20
        assert (
            await client.get("/api/v1/contacts/metadata?unknown=x", headers=headers)
        ).status_code == 422
        path, body = f"/api/v1/enquiries/{eid}/convert", conversion().model_dump(mode="json")
        assert (
            await client.post(path, headers={**headers, "X-CSRF-Token": "bad"}, json=body)
        ).status_code == 403
        assert (
            await client.post(path, headers=headers, json={**body, "title": "Forbidden"})
        ).status_code == 422
        first = await client.post(path, headers=headers, json=body)
        assert first.status_code == 200 and first.headers["cache-control"] == "no-store"
        repeated = await client.post(path, headers=headers, json=body)
        assert repeated.status_code == 200 and repeated.json() == first.json()


def test_replayed_conversion_rechecks_current_contact_scope(settings, database):
    from sqlalchemy import update

    _, token = actor(settings, database)
    other, _ = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid, key = UUID(lead["id"]), uuid4()
    run(settings, database, token, conversion(), eid, key=key)
    with database.session() as session, session.begin():
        session.execute(
            update(Contact)
            .where(Contact.id == UUID(lead["contact"]["id"]))
            .values(primary_agent_id=other)
        )
        session.execute(update(Enquiry).where(Enquiry.id == eid).values(assigned_agent_id=None))
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, token, conversion(), eid, key=key)


def test_lead_edit_saves_profile_and_qualification_in_one_transaction(settings, database):
    from app.contacts.commands import command
    from app.contacts.contracts import EditContact, EditEnquiry

    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    client = EditContact(
        expected_version=1,
        name="Client synthétique qualifié",
        country="FR",
        languages=["french", "english"],
        phones=[{"number": "+33600000002", "is_primary": True}],
    )
    body = EditEnquiry(
        expected_version=1,
        contact_fields=client,
        message="Projet confirmé",
        status="qualified",
        initial_budget="1500000",
        campaign_source="mubawab",
        rating="hot",
    )
    saved = command(
        database, token, settings.facade_secret.get_secret_value(), uuid4(), "enquiries", body, eid
    )
    assert saved["version"] == 2 and saved["contact"]["version"] == 2
    assert saved["contact"]["name"] == client.name
    assert saved["contact"]["country"] == "FR"
    assert saved["contact"]["languages"] == ["french", "english"]
    assert saved["contact"]["primary_phone"] == "+33600000002"
    assert saved["initial_budget"] == "1500000.00 MAD" and saved["rating"] == "hot"
    with pytest.raises(IdentityError, match="VERSION_CONFLICT"):
        command(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            "enquiries",
            body.model_copy(update={"expected_version": 2}),
            eid,
        )
    assert lead_detail(database, token, "enquiries", eid) == saved


def test_incomplete_profile_rolls_back_both_halves_of_lead_edit(settings, database):
    from app.contacts.commands import command
    from app.contacts.contracts import EditContact, EditEnquiry

    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    eid = UUID(lead["id"])
    body = EditEnquiry(
        expected_version=1,
        contact_fields=EditContact(
            expected_version=1,
            name="Ne doit pas être conservé",
            phones=[{"number": "+212600000001", "is_primary": True}],
            languages=[],
        ),
        message="Ne doit pas être conservé",
        status="qualified",
        initial_budget="1500000",
        campaign_source="mubawab",
        rating="hot",
    )
    with pytest.raises(IdentityError, match="LANGUAGES_REQUIRED"):
        command(
            database,
            token,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            "enquiries",
            body,
            eid,
        )
    assert lead_detail(database, token, "enquiries", eid) == lead
