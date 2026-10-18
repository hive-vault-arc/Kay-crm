"""Qualified manual deals share canonical clients, transactions and immutable history."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import event, func, select
from sqlalchemy.orm import Session

from app.contacts.contracts import EditContact
from app.contacts.models import Contact, Enquiry
from app.contacts.queries import read_detail as contact_detail
from app.deals.contracts import ChildQuery, DealQuery, NewDeal
from app.deals.history_models import DealStageEvent
from app.deals.models import Deal, DealReceipt
from app.deals.project_models import DealProject
from app.deals.queries import read_children, read_detail, read_list
from app.identity.security import IdentityError
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import edit, new, run, setup
from tests.test_developments import development
from tests.test_inventory import property_draft

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def new_client_deal(**values):
    return NewDeal.model_validate(
        {
            "new_contact": {
                "name": "Client manuel synthétique",
                "phones": [{"number": "+33600000002", "is_primary": True}],
                "country": "FR",
                "nationality": "MA",
                "languages": ["french", "darija"],
                "roles": ["buyer"],
            },
            "initial_budget": "1250000,50",
            "purchase_reasons": ["residence", "investment"],
            "projects": [{"external_name": "Projet principal"}, {"external_name": "Alternative"}],
            "campaign_source": "instagram_ads",
            "rating": "hot",
            "payment_method": "mortgage",
            "number_of_rooms": 3,
            "notes": "Dossier de test uniquement",
            **values,
        }
    )


def profile_edit(contact, **values):
    return EditContact.model_validate(
        {
            **{
                name: contact[name]
                for name in ("name", "type", "country", "nationality", "languages")
            },
            "phones": [
                {name: phone[name] for name in ("number", "is_primary", "label")}
                for phone in contact["phones"]
            ],
            "emails": [],
            "roles": contact["roles"],
            "expected_version": contact["version"],
            **values,
        }
    )


@pytest.mark.parametrize("project_count", [1, 2, 3])
def test_new_client_and_manual_deal_commit_once_with_exact_facts(settings, database, project_count):
    uid, token = actor(settings, database)
    project_names = ["Projet principal", "Alternative", "Troisième intérêt"][:project_count]
    body = new_client_deal(projects=[{"external_name": name} for name in project_names])
    key = uuid4()
    result = run(settings, database, token, body, key=key)
    assert run(settings, database, token, body, key=key) == result
    deal = read_detail(database, token, UUID(result["id"]))
    assert deal["title"] == "Client manuel synthétique · Projet principal"
    assert deal["enquiry_id"] is None
    assert deal["initial_budget"] == "1250000.50 MAD"
    assert deal["purchase_reasons"] == ["residence", "investment"]
    assert deal["campaign_source"] == "instagram_ads" and deal["rating"] == "hot"
    assert deal["payment_method"] == "mortgage" and deal["number_of_rooms"] == 3
    assert [project["position"] for project in deal["projects"]] == list(
        range(1, project_count + 1)
    )
    assert [project["external_name"] for project in deal["projects"]] == project_names
    assert deal["client_snapshot"]["calling_code"] == "+33"
    assert deal["client_snapshot"]["country"] == "FR"
    assert deal["contact"]["primary_agent"]["id"] == str(uid)
    assert deal["active_reservation"] is None and deal["offering"] is None
    history = read_children(database, token, UUID(deal["id"]), "history", ChildQuery())
    assert history["items"][0]["qualification"]["projects"] == deal["projects"]
    with database.session() as session:
        for model, count in ((Contact, 1), (Enquiry, 0), (Deal, 1), (DealReceipt, 1)):
            assert session.scalar(select(func.count()).select_from(model)) == count


def test_failed_project_and_interrupted_commit_leave_no_client_or_deal(settings, database):
    _, token = actor(settings, database)
    with pytest.raises(IdentityError, match="PROJECT_UNAVAILABLE"):
        run(settings, database, token, new_client_deal(projects=[{"property_id": str(uuid4())}]))

    def fail(session):
        if any(isinstance(value, DealReceipt) for value in session.new):
            raise RuntimeError("SYNTHETIC_MANUAL_DEAL_FAILURE")

    event.listen(Session, "before_commit", fail)
    try:
        with pytest.raises(RuntimeError, match="SYNTHETIC_MANUAL_DEAL_FAILURE"):
            run(settings, database, token, new_client_deal())
    finally:
        event.remove(Session, "before_commit", fail)
    with database.session() as session:
        for model in (Contact, Deal, DealProject, DealStageEvent, DealReceipt):
            assert session.scalar(select(func.count()).select_from(model)) == 0


def test_atomic_client_qualification_edit_preserves_prior_snapshot(settings, database):
    _, token, cid, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(cid))["id"])
    contact = contact_detail(database, token, "contacts", cid)
    body = edit(
        contact_fields=profile_edit(contact, name="Client actualisé", country="FR"),
        projects=[{"external_name": "Autre projet"}, {"external_name": "Projet synthétique SP11"}],
        rating="hot",
    )
    run(settings, database, token, body, did)
    deal = read_detail(database, token, did)
    assert deal["version"] == 2 and deal["title"] == "Client actualisé · Autre projet"
    assert deal["client_snapshot"]["name"] == "Client actualisé"
    assert deal["contact"]["id"] == str(cid) and deal["contact"]["country"] == "FR"
    history = read_children(database, token, did, "history", ChildQuery())["items"]
    assert history[0]["qualification"]["projects"] == deal["projects"]
    assert history[1]["qualification"]["client_snapshot"]["name"] == contact["name"]
    assert history[1]["qualification"]["projects"][0]["name"] == "Projet synthétique SP11"


def test_stale_contact_and_failed_edit_preserve_both_versions(settings, database):
    _, token, cid, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(cid))["id"])
    contact = contact_detail(database, token, "contacts", cid)
    for fields, code in (
        (profile_edit(contact, expected_version=2), "DEAL_VERSION_CONFLICT"),
        (profile_edit(contact, name="Ne doit pas rester", languages=[]), "LANGUAGES_REQUIRED"),
    ):
        with pytest.raises(IdentityError, match=code):
            run(settings, database, token, edit(contact_fields=fields), did)
        assert contact_detail(database, token, "contacts", cid) == contact
        assert read_detail(database, token, did)["version"] == 1


def test_private_contact_and_new_duplicate_never_grant_scope(settings, database):
    _, owner, cid, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, outsider, new(cid))
    with pytest.raises(IdentityError, match="PHONE_OWNED_ELSEWHERE"):
        run(
            settings,
            database,
            outsider,
            new_client_deal(
                new_contact={
                    "name": "Copie refusée",
                    "languages": ["french"],
                    "phones": [{"number": "+212600000001", "is_primary": True}],
                }
            ),
        )
    assert read_list(database, owner, DealQuery())["total"] == 0


def test_rich_filters_and_project_search_apply_scope_before_counts(settings, database):
    _, owner, cid, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    other = UUID(
        create_lead(settings, database, outsider, new_lead("+212600000002"))["contact"]["id"]
    )
    run(settings, database, owner, new(cid, campaign_source="facebook", rating="hot"))
    run(settings, database, outsider, new(other, campaign_source="instagram_ads", rating="hot"))
    for query, total in (
        (DealQuery(q="Projet synthétique SP11"), 1),
        (DealQuery(campaign_source="facebook", rating="hot", country="MA", language="french"), 1),
        (DealQuery(campaign_source="instagram_ads"), 0),
        (DealQuery(country="FR"), 0),
        (DealQuery(language="english"), 0),
    ):
        result = read_list(database, owner, query)
        assert result["total"] == total and sum(result["stage_counts"].values()) == total


@pytest.mark.parametrize("kind", ["development", "property"])
def test_catalogue_interests_keep_exact_parent_and_do_not_reserve_stock(settings, database, kind):
    _, token, cid, _ = setup(settings, database)
    target = (
        development(settings, database, token)
        if kind == "development"
        else property_draft(settings, database, token)
    )
    field = f"{kind}_id"
    result = run(settings, database, token, new(cid, projects=[{field: str(target)}]))
    did = UUID(result["id"])
    deal = read_detail(database, token, did)
    assert deal["projects"][0][field] == str(target)
    assert deal["projects"][0]["external_name"] is None
    assert deal["active_reservation"] is None and deal["offering"] is None
    assert read_list(database, token, DealQuery(**{field: target}))["total"] == 1
    history = read_children(database, token, did, "history", ChildQuery())["items"]
    assert history[0]["qualification"]["projects"] == deal["projects"]
    _, outsider = actor(settings, database)
    assert read_list(database, outsider, DealQuery(**{field: target}))["total"] == 0
