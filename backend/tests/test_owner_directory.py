"""Owner directory uses canonical contact scope and historical inventory links."""

import pytest

from app.contacts.contracts import ListQuery
from app.contacts.owner_portfolio import OwnerPortfolioQuery, read_owner_portfolio
from app.contacts.queries import read_list
from app.identity.security import IdentityError
from app.inventory.contracts import InventoryQuery, Owners
from app.inventory.hierarchy_queries import read_hierarchy
from tests.contact_support import actor, create_lead, new_lead
from tests.test_developments import development
from tests.test_inventory import owners, property_draft, run
from tests.test_ownership import cid

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_owner_directory_scope_and_link_history(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    _, other = actor(settings, database)
    tagged = cid(create_lead(settings, database, agent))
    linked_only = cid(
        create_lead(
            settings,
            database,
            agent,
            new_lead(
                "+212600000002",
                new_contact={
                    "name": "Propriétaire lié synthétique",
                    "phones": [{"number": "+212600000002", "is_primary": True}],
                    "roles": ["buyer"],
                },
            ),
        )
    )
    property_id = property_draft(settings, database, manager)
    owners(settings, database, manager, property_id, [linked_only])
    development_id = development(settings, database, manager)
    run(
        settings,
        database,
        manager,
        "development-owners",
        Owners(
            expected_version=read_hierarchy(
                database, manager, "detail", development_id, InventoryQuery()
            )["version"],
            owners=[{"contact_id": str(linked_only), "marketing_display": "Libellé public"}],
        ),
        development_id,
    )
    listed = read_list(database, agent, "contacts", ListQuery(owner_directory=True, page_size=1))
    assert listed["total"] == 2 and len(listed["items"]) == 1
    assert (
        read_list(
            database, agent, "contacts", ListQuery(owner_directory=True, page=2, page_size=1)
        )["total"]
        == 2
    )
    assert read_list(database, other, "contacts", ListQuery(owner_directory=True))["total"] == 0
    assert read_list(database, manager, "contacts", ListQuery(owner_directory=True))["total"] == 2
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_owner_portfolio(database, other, linked_only, OwnerPortfolioQuery())
    current = read_owner_portfolio(database, agent, linked_only, OwnerPortfolioQuery(page_size=1))
    assert current["total"] == 2 and len(current["items"]) == 1
    assert {
        item["kind"]
        for item in read_owner_portfolio(
            database, agent, linked_only, OwnerPortfolioQuery(page_size=2)
        )["items"]
    } == {"property", "development"}
    assert "+212600000002" not in str(current)
    assert read_owner_portfolio(database, agent, tagged, OwnerPortfolioQuery())["total"] == 0
    owners(settings, database, manager, property_id, [])
    past = read_owner_portfolio(database, agent, linked_only, OwnerPortfolioQuery(status="past"))
    assert past["total"] == 1 and past["items"][0]["id"] == str(property_id)
    assert read_owner_portfolio(database, agent, linked_only, OwnerPortfolioQuery())["total"] == 1


def test_owner_directory_rejects_enquiry_filter(settings, database):
    _, agent = actor(settings, database)
    with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
        read_list(database, agent, "enquiries", ListQuery(owner_directory=True))
