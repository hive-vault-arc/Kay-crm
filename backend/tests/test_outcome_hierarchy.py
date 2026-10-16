"""AT-34 sale/rental child combinations, propagation, and opposite-kind review."""

from uuid import UUID

import pytest

from app.deals.queries import read_detail
from app.identity.security import IdentityError
from app.inventory.contracts import InventoryQuery, NewOffering
from app.inventory.hierarchy_queries import read_hierarchy
from app.inventory.outcome_contracts import ExternalOutcome
from app.inventory.outcome_queries import stock_review
from app.inventory.queries import read_detail as property_detail
from tests.deal_support import new, run
from tests.test_developments import confirm as confirm_whole
from tests.test_inventory import confirm, offering_draft
from tests.test_inventory import run as inventory_command
from tests.test_outcomes import body
from tests.test_reservations import project_fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def rental_scopes(settings, database, token, contact, manager, parent, pid):
    child = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    confirm(settings, database, manager, pid, child)
    development = read_hierarchy(database, manager, "detail", parent, InventoryQuery())
    created = inventory_command(
        settings,
        database,
        manager,
        "create-offering",
        NewOffering(
            development_id=parent,
            expected_development_version=development["version"],
            kind="rental",
            price_mad="99999.99",
            price_period="year",
        ),
    )
    whole = UUID(created["offering_id"])
    confirm_whole(settings, database, manager, parent, whole)
    return [
        UUID(
            run(
                settings,
                database,
                token,
                new(contact, offering_id=str(oid), expected_offering_version=2),
            )["id"]
        )
        for oid in (child, whole)
    ]


@pytest.mark.parametrize("child_kind", ["sale", "rental"])
@pytest.mark.parametrize("whole_kind", ["sale", "rental"])
def test_any_committed_child_blocks_whole_close_without_override(
    settings, database, child_kind, whole_kind
):
    token, contact, manager, parent, pid, _, _, sales = project_fixture(settings, database)
    rentals = rental_scopes(settings, database, token, contact, manager, parent, pid)
    child = sales[0] if child_kind == "sale" else rentals[0]
    whole = sales[1] if whole_kind == "sale" else rentals[1]
    run(settings, database, token, body(database, token, child), child)
    with pytest.raises(IdentityError, match="PARTIAL_DEVELOPMENT_REVIEW_REQUIRED"):
        run(settings, database, token, body(database, token, whole), whole)
    assert read_detail(database, token, child)["stage"] == "won"
    assert read_detail(database, token, whole)["stage"] == "new"


@pytest.mark.parametrize("kind", ["sale", "rental"])
def test_whole_external_outcome_propagates_without_any_kay_win(settings, database, kind):
    token, contact, manager, parent, pid, _, _, sales = project_fixture(settings, database)
    rentals = rental_scopes(settings, database, token, contact, manager, parent, pid)
    did = sales[1] if kind == "sale" else rentals[1]
    deal = read_detail(database, token, did)
    oid = UUID(deal["offering"]["id"])
    preview = stock_review(database, manager, parent, oid, development=True)
    request = ExternalOutcome(
        expected_version=preview["expected_target_version"],
        offering_id=oid,
        expected_offering_version=preview["expected_offering_version"],
        expected_stock_fingerprint=preview["expected_stock_fingerprint"],
        completed_on="2026-10-15",
        explanation="Disposition externe synthétique du programme",
    )
    inventory_command(settings, database, manager, "development-external-outcome", request, parent)
    assert all(read_detail(database, token, deal)["stage"] == "new" for deal in (*sales, *rentals))
    assert all(
        read_detail(database, token, deal)["stock_review_required"] for deal in (*sales, *rentals)
    )
    offers = {o["kind"]: o for o in property_detail(database, manager, pid)["offerings"]}
    if kind == "sale":
        assert offers == {}
    else:
        assert set(offers) == {"sale"} and offers["sale"]["state"] == "available"
        assert offers["sale"]["occupied"] is True


def test_whole_close_with_opposite_child_hold_requires_review(settings, database):
    token, contact, manager, parent, pid, _, _, sales = project_fixture(settings, database)
    rentals = rental_scopes(settings, database, token, contact, manager, parent, pid)
    run(settings, database, token, reviewed(database, token, rentals[0]), rentals[0])
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(settings, database, token, body(database, token, sales[1]), sales[1])
    assert read_detail(database, token, rentals[0])["active_reservation"] is not None
