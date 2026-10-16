"""SP-13 additive preservation and immutable-history downgrade refusal."""

import pytest
from sqlalchemy import text

from tests.deal_support import run
from tests.test_isolation_migrations import migrate
from tests.test_outcomes import body
from tests.test_reservations import fixture

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_0014_upgrade_and_retained_history_refuse_downgrade(settings, database):
    _, token, _, _, _, oid, did = fixture(settings, database)
    with database.engine.connect() as connection:
        before = connection.execute(text("SELECT * FROM deal WHERE id=:id"), {"id": did}).one()
        offering = connection.execute(
            text("SELECT * FROM offering WHERE id=:id"), {"id": oid}
        ).one()
    assert migrate("downgrade", "0014_reservations").returncode == 0
    try:
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(text("SELECT * FROM deal WHERE id=:id"), {"id": did}).one()
                == before
            )
            assert (
                connection.execute(text("SELECT * FROM offering WHERE id=:id"), {"id": oid}).one()
                == offering
            )
        run(settings, database, token, body(database, token, did), did)
        assert migrate("downgrade", "0014_reservations").returncode != 0
        run(settings, database, token, body(database, token, did, reopen=True), did)
        assert migrate("downgrade", "0014_reservations").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
