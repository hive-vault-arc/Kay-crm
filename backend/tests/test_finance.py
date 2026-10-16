"""SP-16 exact arithmetic, append-only facts and real PostgreSQL finance boundaries."""

from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.finance.commands import command
from app.finance.contracts import (
    CorrectCommission,
    CorrectReceipt,
    FinanceQuery,
    NewCommission,
    NewReceipt,
    Recognize,
    Terms,
)
from app.finance.models import Commission, CommissionRevision, FinanceReceipt, Receipt
from app.finance.queries import read
from app.identity.security import IdentityError
from tests.contact_support import actor
from tests.deal_support import new, run, setup

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def fixture(settings, database):
    uid, agent, contact, _ = setup(settings, database)
    manager_id, manager = actor(settings, database, "manager")
    did = UUID(run(settings, database, agent, new(contact))["id"])
    return uid, agent, manager_id, manager, did


def execute(settings, database, token, body, *, did=None, cid=None, key=None):
    return command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        key or uuid4(),
        body,
        did=did,
        cid=cid,
    )


def terms(**values):
    return {"kind": "fixed", "base_mad": "1000000.00", "amount_mad": "10000.00"} | values


def create(settings, database, token, did, **values):
    return UUID(
        execute(
            settings,
            database,
            token,
            NewCommission(expected_deal_version=1, **terms(**values)),
            did=did,
        )["id"]
    )


def receipt(version, amount="2500.00"):
    return NewReceipt(
        expected_version=version,
        amount_mad=amount,
        received_on="2026-10-15",
        reason="SP16 versement synthétique",
    )


@pytest.mark.parametrize(
    ("base", "rate", "expected"),
    [
        ("10.05", "10", "1.01"),
        ("0.05", "10", "0.01"),
        ("100.00000001", "1.005", "1.01"),
        ("9999999999999999.99999999", "0.00000001", "1000000.00"),
    ],
)
def test_exact_percentage_rounds_final_only(base, rate, expected):
    value = Terms(kind="percentage", base_mad=base, rate_percent=rate)
    assert value.calculated() == Decimal(expected)


@pytest.mark.parametrize(
    "values",
    [
        {"base_mad": 1.5},
        {"amount_mad": 1.5},
        {"base_mad": "NaN"},
        {"amount_mad": "Infinity"},
        {"amount_mad": "1.001"},
        {"amount_mad": "0"},
        {"base_mad": "1.000000001"},
        {"rate_percent": "2"},
        {"balance_mad": "10000.00"},
        {"kind": "percentage", "amount_mad": None, "rate_percent": "0.000000001"},
    ],
)
def test_strict_money_no_float_forged_balance_or_precision(values):
    with pytest.raises(ValidationError):
        Terms.model_validate(terms() | values)


def test_recognition_partial_over_collection_correction_void_and_retained_history(
    settings, database, monkeypatch
):
    _, agent, manager_id, manager, did = fixture(settings, database)
    cid = create(settings, database, manager, did)
    assert read(database, manager, cid, FinanceQuery(), "detail")["balance_mad"] is None
    with pytest.raises(IdentityError, match="COMMISSION_NOT_RECOGNIZED"):
        execute(settings, database, manager, receipt(1), cid=cid)
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)
    key = uuid4()
    first = execute(settings, database, manager, receipt(2), cid=cid, key=key)
    assert execute(settings, database, manager, receipt(2), cid=cid, key=key) == first
    current = read(database, manager, cid, FinanceQuery(), "detail")
    assert current["collected_mad"] == "2500.00" and current["balance_mad"] == "7500.00"
    with pytest.raises(IdentityError, match="OVER_COLLECTION"):
        execute(settings, database, manager, receipt(3, "7500.01"), cid=cid)
    records = read(database, manager, cid, FinanceQuery(), "receipts")["items"]
    original = records[0]
    correction = CorrectReceipt(
        target="receipt",
        expected_version=3,
        receipt_id=original["id"],
        replacement=receipt(3, "2000.00").model_dump(exclude={"expected_version"}),
        reason="SP16 montant corrigé avec original conservé",
    )
    execute(settings, database, manager, correction, cid=cid)
    current = read(database, manager, cid, FinanceQuery(), "detail")
    assert current["balance_mad"] == "8000.00"
    records = read(database, manager, cid, FinanceQuery(), "receipts")["items"]
    replacement = next(row for row in records if row["valid"])
    assert next(row for row in records if row["id"] == original["id"]) | {"valid": True} == original
    assert replacement["supersedes_id"] == original["id"] and replacement["actor"]["id"] == str(
        manager_id
    )
    with pytest.raises(IdentityError, match="COMMISSION_BELOW_COLLECTIONS"):
        execute(
            settings,
            database,
            manager,
            CorrectCommission.model_validate(
                terms()
                | {
                    "target": "commission",
                    "expected_version": 4,
                    "amount_mad": "1000.00",
                    "reason": "SP16 correction incompatible",
                }
            ),
            cid=cid,
        )
    execute(
        settings,
        database,
        manager,
        CorrectReceipt(
            target="receipt",
            expected_version=4,
            receipt_id=replacement["id"],
            replacement=None,
            reason="SP16 annulation du versement erroné",
        ),
        cid=cid,
    )
    assert read(database, manager, cid, FinanceQuery(), "detail")["balance_mad"] == "10000.00"
    assert read(database, manager, cid, FinanceQuery(), "revisions")["total"] == 5
    for mode in ("detail", "receipts", "revisions"):
        with pytest.raises(IdentityError, match="FORBIDDEN"):
            read(database, agent, cid, FinanceQuery(), mode)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Receipt)) == 3
        assert session.scalar(select(func.count()).select_from(FinanceReceipt)) == 5
    for statement in (
        "UPDATE receipt SET amount_mad=1",
        "DELETE FROM commission_revision",
        "UPDATE commission SET version=version+1",
    ):
        with pytest.raises(IntegrityError), database.engine.begin() as connection:
            connection.execute(text(statement))


def test_database_balance_guard_survives_a_bypassed_service_calculation(
    settings, database, monkeypatch
):
    _, _, _, manager, did = fixture(settings, database)
    cid = create(settings, database, manager, did)
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)
    execute(settings, database, manager, receipt(2), cid=cid)
    monkeypatch.setattr("app.finance.commands.collected", lambda *args: Decimal(0))
    with pytest.raises(IntegrityError):
        execute(settings, database, manager, receipt(3, "8000.00"), cid=cid)
    assert read(database, manager, cid, FinanceQuery(), "detail")["balance_mad"] == "7500.00"
    with database.session() as session:
        assert session.get(Commission, cid).version == 3
        assert session.scalar(select(func.count()).select_from(Receipt)) == 1
        assert session.scalar(select(func.count()).select_from(CommissionRevision)) == 3
