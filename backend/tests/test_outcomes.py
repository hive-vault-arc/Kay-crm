"""SP-13 commercial/stock invariants on the guarded real PostgreSQL target."""

from datetime import date
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.deals.contracts import ChildQuery, CloseDeal, ReopenDeal
from app.deals.models import Deal
from app.deals.outcome_models import DealOutcome, DealReopening
from app.deals.outcome_queries import outcomes, stock_review
from app.deals.queries import read_detail
from app.identity.security import IdentityError
from app.inventory.models import Offering
from app.inventory.outcome_contracts import ExternalOutcome
from app.inventory.outcome_models import StockEffect, StockOutcome
from app.inventory.outcome_queries import stock_review as external_review
from tests.contact_support import actor
from tests.deal_support import new, run
from tests.test_inventory import confirm, offering_draft
from tests.test_inventory import run as inventory_command
from tests.test_reservations import fixture, project_fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def body(database, token, did, *, outcome="won", reopen=False):
    review = stock_review(database, token, did)
    fields = {
        "expected_version": review["expected_version"],
        **{
            k: v
            for k, v in (review["stock"] or {}).items()
            if k.startswith("expected_") or k == "offering_id"
        },
    }
    if reopen:
        return ReopenDeal(**fields, reason="Réouverture synthétique expliquée")
    return CloseDeal(
        **fields,
        outcome=outcome,
        agreed_amount_mad="11999.99" if outcome == "won" else None,
        completed_on=date(2026, 10, 15),
        explanation="Accord privé synthétique SP13",
    )


def sale_fixture(settings, database):
    _, token, contact, manager, pid, rental, rental_deal = fixture(settings, database)
    sale = UUID(
        offering_draft(settings, database, manager, pid, kind="sale", period=None)["offering_id"]
    )
    confirm(settings, database, manager, pid, sale)
    sale_deal = UUID(
        run(
            settings,
            database,
            token,
            new(contact, offering_id=str(sale), expected_offering_version=2),
        )["id"]
    )
    return token, contact, manager, pid, rental, rental_deal, sale, sale_deal


def test_sale_releases_rental_flags_without_closing_and_reopens_without_resurrecting_hold(
    settings, database
):
    token, _, _, _, rental, rental_deal, sale, did = sale_fixture(settings, database)
    run(settings, database, token, reviewed(database, token, rental_deal), rental_deal)
    request, key = body(database, token, did), uuid4()
    first = run(settings, database, token, request, did, key=key)
    assert run(settings, database, token, request, did, key=key) == first
    detail = read_detail(database, token, did)
    competing = read_detail(database, token, rental_deal)
    assert detail["stage"] == "won" and detail["offering"]["state"] == "sold"
    assert competing["stage"] == "new" and competing["stock_review_required"]
    assert competing["active_reservation"] is None and competing["offering"]["state"] == "withdrawn"
    history = outcomes(database, token, did, ChildQuery())["items"]
    assert history[0]["agreed_amount_mad"] == "11999.99" and history[0]["reopening"] is None
    run(settings, database, token, body(database, token, did, reopen=True), did)
    assert read_detail(database, token, did)["stage"] == "negotiation"
    assert read_detail(database, token, did)["offering"]["state"] == "available"
    assert read_detail(database, token, rental_deal)["offering"]["state"] == "available"
    assert read_detail(database, token, rental_deal)["active_reservation"] is None
    history = outcomes(database, token, did, ChildQuery())["items"]
    assert history[0]["reopening"]["reason"] == "Réouverture synthétique expliquée"
    assert history[0]["agreed_amount_mad"] == "11999.99"
    assert run(settings, database, token, request, did, key=key) == first
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == 1
        assert session.scalar(select(func.count()).select_from(DealReopening)) == 1
        assert session.get(Offering, sale).state == "available"
        assert session.get(Offering, rental).is_current


def test_rental_leaves_sale_active_and_sale_keeps_completed_rental_history(settings, database):
    token, _, _, _, _, rental_deal, _, did = sale_fixture(settings, database)
    run(settings, database, token, body(database, token, rental_deal), rental_deal)
    assert read_detail(database, token, did)["offering"]["state"] == "available"
    assert read_detail(database, token, did)["offering"]["occupied"] is True
    assert read_detail(database, token, did)["stage"] == "new"
    assert read_detail(database, token, did)["stock_review_required"] is True
    run(settings, database, token, body(database, token, did), did)
    assert read_detail(database, token, rental_deal)["offering"]["state"] == "rented"
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == 2
    run(settings, database, token, body(database, token, did, reopen=True), did)
    assert read_detail(database, token, rental_deal)["offering"]["state"] == "rented"


@pytest.mark.parametrize("outcome", ["lost", "cancelled"])
def test_non_win_closes_without_amount_and_releases_only_own_hold(settings, database, outcome):
    _, token, _, _, _, _, did = fixture(settings, database)
    run(settings, database, token, reviewed(database, token, did), did)
    run(settings, database, token, body(database, token, did, outcome=outcome), did)
    detail = read_detail(database, token, did)
    assert detail["stage"] == outcome and detail["offering"]["state"] == "available"
    assert detail["active_reservation"] is None
    run(settings, database, token, body(database, token, did, reopen=True), did)
    assert read_detail(database, token, did)["stage"] == "negotiation"
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(StockOutcome)) == 0


def test_whole_sale_propagates_and_unit_close_blocks_later_whole_sale(settings, database):
    token, _, _, _, _, _, _, deals = project_fixture(settings, database)
    run(settings, database, token, body(database, token, deals[1]), deals[1])
    assert read_detail(database, token, deals[0])["offering"]["state"] == "withdrawn"
    assert read_detail(database, token, deals[0])["stage"] == "new"
    assert read_detail(database, token, deals[0])["stock_review_required"]
    run(settings, database, token, body(database, token, deals[1], reopen=True), deals[1])
    run(settings, database, token, body(database, token, deals[0]), deals[0])
    assert read_detail(database, token, deals[1])["offering"]["state"] == "review"
    with pytest.raises(IdentityError, match="PARTIAL_DEVELOPMENT_REVIEW_REQUIRED"):
        run(settings, database, token, body(database, token, deals[1]), deals[1])
    assert outcomes(database, token, deals[1], ChildQuery())["total"] == 1


def test_external_outcome_is_manager_only_and_creates_no_kay_win(settings, database):
    _, token, _, manager, pid, oid, did = fixture(settings, database)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        external_review(database, token, pid, oid, development=False)
    review = external_review(database, manager, pid, oid, development=False)
    command = ExternalOutcome(
        expected_version=review["expected_target_version"],
        offering_id=oid,
        expected_offering_version=review["expected_offering_version"],
        expected_stock_fingerprint=review["expected_stock_fingerprint"],
        completed_on=date(2026, 10, 15),
        explanation="Location externe synthétique partagée",
    )
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        inventory_command(settings, database, token, "external-outcome", command, pid)
    inventory_command(settings, database, manager, "external-outcome", command, pid)
    detail = read_detail(database, token, did)
    assert detail["stage"] == "new" and detail["stock_review_required"]
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(DealOutcome)) == 0
        assert session.scalar(select(func.count()).select_from(StockOutcome)) == 1


def test_invalid_fields_denied_scope_and_sql_history_guards(settings, database):
    _, token, _, _, _, _, did = fixture(settings, database)
    request = body(database, token, did)
    for patch in (
        {"agreed_amount_mad": None},
        {"explanation": " "},
        {"completed_on": None},
        {"commission": "100"},
        {"primary_agent_at_close_id": str(uuid4())},
    ):
        with pytest.raises(ValidationError):
            CloseDeal.model_validate({**request.model_dump(), **patch})
    _, outsider = actor(settings, database)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, outsider, request, did)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(text("UPDATE deal SET stage='won' WHERE id=:id"), {"id": did})
    run(settings, database, token, request, did)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.execute(
            text("UPDATE deal_outcome SET agreed_amount_mad=1 WHERE deal_id=:id"), {"id": did}
        )
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(StockEffect)) == 1
        assert session.get(Deal, did).stage == "won"
