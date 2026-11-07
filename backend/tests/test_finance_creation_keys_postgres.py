"""Prepared isolated PostgreSQL cases; not part of connection-forbidden units."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update

from app.deals.models import Deal
from app.finance import creation_keys
from app.finance.contracts import NewCommission, Recognize
from app.finance.models import Commission, CommissionRevision, FinanceReceipt
from app.identity.security import IdentityError
from tests.test_finance import execute, fixture, terms
from tests.test_finance_creation_keys_unit import key_at

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def old_creation(monkeypatch, settings, database, manager, did, age):
    instant = datetime.now(UTC) - age
    key = key_at(instant)
    body = NewCommission(expected_deal_version=1, **terms())

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant

    with monkeypatch.context() as patch:
        patch.setattr(creation_keys, "datetime", Clock)
        result = execute(settings, database, manager, body, did=did, key=key)
    with database.session() as session, session.begin():
        session.execute(
            update(FinanceReceipt).where(FinanceReceipt.key == key).values(created_at=instant)
        )
    return key, body, result


def test_retained_receipt_replays_after_start_window_before_24h(settings, database, monkeypatch):
    _, _, _, manager, did = fixture(settings, database)
    key, body, first = old_creation(
        monkeypatch, settings, database, manager, did, timedelta(hours=23)
    )
    assert execute(settings, database, manager, body, did=did, key=key) == first
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Commission)) == 1
        assert session.scalar(select(func.count()).select_from(CommissionRevision)) == 1
        assert session.get(Deal, did).version == 1


def test_pruned_old_key_cannot_recreate_with_unchanged_parent(settings, database, monkeypatch):
    _, _, _, manager, did = fixture(settings, database)
    key, body, first = old_creation(
        monkeypatch, settings, database, manager, did, timedelta(hours=25)
    )
    cid = UUID(first["id"])
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)
    with database.session() as session:
        assert session.scalar(select(FinanceReceipt).where(FinanceReceipt.key == key)) is None
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_EXPIRED"):
        execute(settings, database, manager, body, did=did, key=key)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Commission)) == 1
        assert session.scalar(select(func.count()).select_from(CommissionRevision)) == 2
        assert session.get(Commission, cid).version == 2
        assert session.get(Deal, did).version == 1


def test_cached_legacy_key_replays_but_pruned_legacy_key_cannot_restart(
    settings, database, monkeypatch
):
    _, _, _, manager, did = fixture(settings, database)
    key, body, first = old_creation(
        monkeypatch, settings, database, manager, did, timedelta(hours=23)
    )
    legacy, cid = uuid4(), UUID(first["id"])
    with database.session() as session, session.begin():
        session.execute(update(FinanceReceipt).where(FinanceReceipt.key == key).values(key=legacy))
    assert execute(settings, database, manager, body, did=did, key=legacy) == first
    with database.session() as session, session.begin():
        session.execute(
            update(FinanceReceipt)
            .where(FinanceReceipt.key == legacy)
            .values(created_at=datetime.now(UTC) - timedelta(hours=25))
        )
    execute(settings, database, manager, Recognize(expected_version=1), cid=cid)
    with pytest.raises(IdentityError, match="FINANCE_CREATION_KEY_REQUIRED"):
        execute(settings, database, manager, body, did=did, key=legacy)
    with database.session() as session:
        assert session.scalar(select(func.count()).select_from(Commission)) == 1
        assert session.scalar(select(func.count()).select_from(CommissionRevision)) == 2
