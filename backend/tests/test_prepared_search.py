"""Prepared real-PostgreSQL scope/legacy cases; never part of the pure unit selection."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.contacts.models import Enquiry
from app.contacts.queries import read_detail
from app.discovery.contracts import SearchQuery
from app.discovery.search import search
from app.files.service import list_documents, read_document
from app.generated.catalog import BY_CODE
from app.generated.contracts import GenerateRequest
from app.generated.service import generate, history
from app.identity.security import IdentityError
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import new, run, setup
from tests.test_ownership import change, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def make_pdf(settings, database, token, kind, parent, code="01"):
    return generate(
        database,
        settings,
        token,
        uuid4(),
        GenerateRequest(parent_kind=kind, parent_id=parent, template_code=code, values={}),
    )


@pytest.mark.parametrize("manager_role", ["manager", "administrator"])
def test_prepared_parents_finance_counts_pages_and_legacy_mode(settings, database, manager_role):
    _, agent, contact, enquiry = setup(settings, database)
    other_id, other = actor(settings, database)
    hidden = create_lead(settings, database, other, new_lead("+212600000002"))
    _, manager = actor(settings, database, manager_role)
    deal = UUID(run(settings, database, agent, new(contact))["id"])
    lead_pdf = make_pdf(settings, database, agent, "enquiry", enquiry)
    deal_pdf = make_pdf(settings, database, agent, "deal", deal)
    finance = make_pdf(settings, database, manager, "deal", deal, "10")
    private = make_pdf(settings, database, other, "enquiry", UUID(hidden["id"]))

    first = search(
        database,
        agent,
        SearchQuery(q="KAY-", kind="generated_document", page_size=1),
        prepared=True,
    )
    second = search(
        database,
        agent,
        SearchQuery(q="KAY-", kind="generated_document", page=2, page_size=1),
        prepared=True,
    )
    assert first["search_version"] == 2 and first["total"] == second["total"] == 2
    assert first["counts"]["generated_document"] == 2
    assert {item["id"] for page in (first, second) for item in page["items"]} == {
        lead_pdf["id"],
        deal_pdf["id"],
    }
    assert finance["id"] not in str(first) + str(second)
    assert private["id"] not in str(first) + str(second)
    assert all(
        item["href"].endswith("?tab=documents")
        for page in (first, second)
        for item in page["items"]
    )
    titled = search(
        database,
        agent,
        SearchQuery(q=BY_CODE["01"].title, kind="generated_document"),
        prepared=True,
    )
    assert titled["total"] == 2
    assert (
        search(
            database,
            agent,
            SearchQuery(q=BY_CODE["10"].title, kind="generated_document"),
            prepared=True,
        )["total"]
        == 0
    )
    assert (
        search(database, manager, SearchQuery(q="KAY-", kind="generated_document"), prepared=True)[
            "total"
        ]
        == 4
    )

    legacy = search(database, agent, SearchQuery(q="KAY-", kind="document"))
    assert legacy["total"] == 1 and legacy["items"][0]["id"] == deal_pdf["id"]
    assert "search_version" not in legacy
    assert set(legacy["items"][0]) == {"id", "kind", "label", "href"}
    assert list_documents(database, agent, "deal", deal, 1, 20)["total"] == 1
    assert history(database, agent, "deal", deal, 1)["total"] == 1
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_document(database, agent, UUID(finance["id"]))

    version = read_detail(database, manager, "contacts", contact)["version"]
    change(
        settings,
        database,
        manager,
        contact,
        intent("assign", version, primary_agent_id=str(other_id)),
    )
    assert (
        search(database, agent, SearchQuery(q="KAY-", kind="generated_document"), prepared=True)[
            "total"
        ]
        == 0
    )
    assert search(database, agent, SearchQuery(q="KAY-", kind="document"))["total"] == 0


def test_unassigned_and_archived_enquiry_scope_precedes_prepared_counts(settings, database):
    _, agent, _, enquiry = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    make_pdf(settings, database, agent, "enquiry", enquiry)
    make_pdf(settings, database, manager, "enquiry", enquiry, "11")
    with database.session() as session, session.begin():
        session.get(Enquiry, enquiry).assigned_agent_id = None
    query = SearchQuery(q="KAY-", kind="generated_document")
    assert search(database, agent, query, prepared=True)["total"] == 0
    assert search(database, manager, query, prepared=True)["total"] == 2
    with database.session() as session, session.begin():
        session.get(Enquiry, enquiry).archived_at = datetime.now(UTC)
    assert search(database, manager, query, prepared=True)["total"] == 0
    assert history(database, manager, "enquiry", enquiry, 1)["total"] == 2
