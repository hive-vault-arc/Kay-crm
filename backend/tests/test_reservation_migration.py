"""Frozen SP-12 DDL preserves earlier records and refuses destructive history loss."""

import pytest
from sqlalchemy import text

from tests.deal_support import run
from tests.test_isolation_migrations import migrate
from tests.test_reservations import fixture, reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_upgrade_preserves_deal_stock_and_refuses_reservation_loss(settings, database):
    _, token, _, _, _, oid, did = fixture(settings, database)
    with database.engine.connect() as connection:
        before = connection.execute(text("SELECT * FROM deal WHERE id=:id"), {"id": did}).one()
        stock = connection.execute(text("SELECT * FROM offering WHERE id=:id"), {"id": oid}).one()
    assert migrate("downgrade", "0013_deal_pipeline").returncode == 0
    try:
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(text("SELECT * FROM deal WHERE id=:id"), {"id": did}).one()
                == before
            )
            assert (
                connection.execute(text("SELECT * FROM offering WHERE id=:id"), {"id": oid}).one()
                == stock
            )
        run(settings, database, token, reviewed(database, token, did), did)
        assert migrate("downgrade", "0013_deal_pipeline").returncode != 0
        run(
            settings,
            database,
            token,
            reviewed(database, token, did, "Conservation après libération"),
            did,
        )
        assert migrate("downgrade", "0013_deal_pipeline").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
