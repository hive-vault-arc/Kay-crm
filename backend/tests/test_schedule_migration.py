"""Additive SP-14 migration preserves prior records and refuses retained history loss."""

import pytest
from sqlalchemy import text

from tests.deal_support import setup
from tests.test_isolation_migrations import migrate
from tests.test_schedule import booking, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_additive_0016_prior_rows_preserved_and_history_downgrade_refused(settings, database):
    uid, token, cid, _ = setup(settings, database)
    with database.engine.connect() as connection:
        before = connection.execute(text("SELECT * FROM contact WHERE id=:id"), dict(id=cid)).one()
    assert migrate("downgrade", "0015_outcomes_reopening").returncode == 0
    try:
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(text("SELECT * FROM contact WHERE id=:id"), dict(id=cid)).one()
                == before
            )
        run(settings, database, token, booking(uid, cid, type="office"))
        assert migrate("downgrade", "0015_outcomes_reopening").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
