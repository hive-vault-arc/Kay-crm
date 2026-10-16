"""Actual separate connections exercise races, authority waits and retained reopening."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.deals.queries import read_detail
from app.files.models import Document, DocumentVersion
from app.finance.contracts import CorrectCommission, FinanceQuery, NewCommission, Recognize
from app.finance.models import Commission, CommissionRevision, FinanceReceipt, Receipt
from app.finance.queries import read
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import run
from tests.identity_support import observe_two_lock_waiters
from tests.test_finance import create, execute, fixture, receipt, terms
from tests.test_outcomes import body, sale_fixture
from tests.test_ownership import change, intent

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_receipt_race_uses_two_actual_waiting_transactions_and_rechecks_balance(settings, database):
    _, _, _, manager, did = fixture(settings, database)
    cid = create(settings, database, manager, did)
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)

    def collect():
        try:
            return execute(settings, database, manager, receipt(2, "7500.00"), cid=cid)
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.session() as blocker, blocker.begin():
            blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            futures = [pool.submit(collect) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
        results = [future.result(timeout=10) for future in futures]
    assert sum(isinstance(value, dict) for value in results) == 1
    assert "VERSION_CONFLICT" in results
    execute(settings, database, manager, receipt(3, "2500.00"), cid=cid)
    assert read(database, manager, cid, FinanceQuery(), "detail")["balance_mad"] == "0.00"
    with pytest.raises(IdentityError, match="OVER_COLLECTION"):
        execute(settings, database, manager, receipt(4, "0.01"), cid=cid)


def test_current_role_rechecked_after_actual_agency_wait_and_before_old_retry(settings, database):
    _, _, manager_id, manager, did = fixture(settings, database)
    cid = create(settings, database, manager, did)
    key = uuid4()
    request = Recognize(expected_version=1)
    execute(settings, database, manager, request, cid=cid, key=key)

    def replay():
        try:
            execute(settings, database, manager, request, cid=cid, key=key)
            return "WRONG_SUCCESS"
        except IdentityError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        with database.session() as blocker, blocker.begin():
            blocker.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
            futures = [pool.submit(replay) for _ in range(2)]
            observe_two_lock_waiters(database, "agency")
            blocker.execute(
                update(User)
                .where(User.id == manager_id)
                .values(state="disabled", version=User.version + 1)
            )
        assert all(
            future.result(timeout=10) in {"UNAUTHENTICATED", "FORBIDDEN"} for future in futures
        )
    with database.session() as session:
        assert session.get(Commission, cid).version == 2
        assert session.scalar(select(func.count()).select_from(FinanceReceipt)) == 2


def test_interrupted_transaction_rolls_back_all_financial_facts_and_same_key_can_retry(
    settings, database, monkeypatch
):
    _, _, _, manager, did = fixture(settings, database)
    key = uuid4()
    request = NewCommission(expected_deal_version=1, **terms())
    original = Session.add

    def interrupted(session, instance, *args, **kwargs):
        if isinstance(instance, FinanceReceipt):
            raise RuntimeError("SP16_CONTROLLED_BEFORE_COMMIT")
        return original(session, instance, *args, **kwargs)

    with monkeypatch.context() as patch:
        patch.setattr(Session, "add", interrupted)
        with pytest.raises(RuntimeError, match="SP16_CONTROLLED_BEFORE_COMMIT"):
            execute(settings, database, manager, request, did=did, key=key)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Commission)) == 0
        assert session.scalar(select(func.count()).select_from(CommissionRevision)) == 0
    first = execute(settings, database, manager, request, did=did, key=key)
    assert execute(settings, database, manager, request, did=did, key=key) == first
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        execute(
            settings,
            database,
            manager,
            NewCommission.model_validate(request.model_dump() | {"amount_mad": "10001.00"}),
            did=did,
            key=key,
        )


def test_won_reopen_preserves_finance_and_requests_review_without_agent_disclosure(
    settings, database
):
    agent, _, manager, _, _, _, _, did = sale_fixture(settings, database)
    run(settings, database, agent, body(database, agent, did), did)
    cid = UUID(
        execute(
            settings, database, manager, NewCommission(expected_deal_version=2, **terms()), did=did
        )["id"]
    )
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)
    execute(settings, database, manager, receipt(2), cid=cid)
    with database.session() as session:
        original_receipt = session.execute(text("SELECT to_jsonb(r) FROM receipt r")).scalar_one()
        original_revisions = (
            session.execute(text("SELECT to_jsonb(r) FROM commission_revision r ORDER BY version"))
            .scalars()
            .all()
        )
    run(settings, database, agent, body(database, agent, did, reopen=True), did)
    current = read(database, manager, cid, FinanceQuery(), "detail")
    assert current["version"] == 4 and current["current"]["review_required"] is True
    assert current["current"]["action"] == "reopen_review" and current["balance_mad"] == "7500.00"
    assert not any(
        "commission" in field or "finance" in field for field in read_detail(database, agent, did)
    )
    with database.session() as session:
        assert (
            session.execute(text("SELECT to_jsonb(r) FROM receipt r")).scalar_one()
            == original_receipt
        )
        assert (
            session.execute(
                text(
                    "SELECT to_jsonb(r) FROM commission_revision r "
                    "WHERE version<=3 ORDER BY version"
                )
            )
            .scalars()
            .all()
            == original_revisions
        )
    correction = CorrectCommission.model_validate(
        terms()
        | {
            "target": "commission",
            "expected_version": 4,
            "amount_mad": "11000.00",
            "reason": "SP16 revue explicite après réouverture",
        }
    )
    execute(settings, database, manager, correction, cid=cid)
    current = read(database, manager, cid, FinanceQuery(), "detail")
    assert current["current"]["review_required"] is False and current["balance_mad"] == "8500.00"
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Receipt)) == 1


def test_administrator_evidence_binding_and_archive_retains_readonly_finance(settings, database):
    uid, agent, _, manager, did = fixture(settings, database)
    _, admin = actor(settings, database, "administrator")
    cid = create(settings, database, admin, did)
    execute(settings, database, admin, Recognize(expected_version=1), cid=cid)
    contact = UUID(read_detail(database, manager, did)["contact"]["id"])
    document_id, version_id = uuid4(), uuid4()
    # Metadata-only isolated fixture: this does not claim a fresh antivirus scan.
    with database.session() as session, session.begin():
        session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
        session.add(
            Document(
                id=document_id,
                deal_id=did,
                filename="SP16 preuve synthétique.png",
                mime_type="image/png",
                size_bytes=10,
                created_by_user_id=uid,
            )
        )
        session.flush()
        session.add(
            DocumentVersion(
                id=version_id,
                document_id=document_id,
                object_key=uuid4(),
                created_by_user_id=uid,
                size_bytes=10,
                sha256=b"x" * 32,
                state="pending_scan",
            )
        )
    request = receipt(2).model_copy(update={"evidence_document_id": document_id})
    with pytest.raises(IdentityError, match="INVALID_FINANCIAL_EVIDENCE"):
        execute(settings, database, admin, request, cid=cid)
    with database.session() as session, session.begin():
        session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
        session.execute(
            update(DocumentVersion)
            .where(DocumentVersion.id == version_id)
            .values(
                state="clean",
                scanned_at=datetime.now(UTC),
                scanner_version="synthetic-metadata-only",
            )
        )
    execute(settings, database, admin, request, cid=cid)
    rows = read(database, admin, cid, FinanceQuery(), "receipts")["items"]
    assert rows[0]["evidence_document_id"] == str(document_id)
    assert rows[0]["evidence_version_id"] == str(version_id)
    with pytest.raises(IdentityError, match="INVALID_FINANCIAL_EVIDENCE"):
        execute(
            settings,
            database,
            admin,
            receipt(3).model_copy(update={"evidence_document_id": uuid4()}),
            cid=cid,
        )
    before = read(database, admin, cid, FinanceQuery(), "detail")
    change(settings, database, manager, contact, intent("archive"))
    assert read(database, admin, cid, FinanceQuery(), "detail") == before
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        execute(settings, database, admin, receipt(3), cid=cid)
    assert read(database, admin, cid, FinanceQuery(), "receipts")["items"] == rows
    change(settings, database, manager, contact, intent("restore", version=2))
    survivor = UUID(
        create_lead(settings, database, agent, new_lead("+212600000002"))["contact"]["id"]
    )
    change(
        settings,
        database,
        manager,
        contact,
        intent("merge", version=3, survivor_id=survivor, survivor_expected_version=1),
    )
    assert read(database, admin, cid, FinanceQuery(), "detail") == before
    assert read(database, admin, cid, FinanceQuery(), "receipts")["items"] == rows
