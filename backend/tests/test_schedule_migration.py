"""Additive SP-14 migration preserves prior records and refuses retained history loss."""

import pytest
from sqlalchemy import text

from tests.contact_support import actor
from tests.legacy_support import contact as legacy_contact
from tests.test_isolation_migrations import migrate
from tests.test_schedule import booking, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_additive_0016_prior_rows_preserved_and_history_downgrade_refused(settings, database):
    uid, token = actor(settings, database)
    assert migrate("downgrade", "0015_outcomes_reopening").returncode == 0
    try:
        cid = legacy_contact(database, uid)
        with database.engine.connect() as connection:
            before = connection.scalar(
                text("SELECT to_jsonb(c) FROM contact c WHERE id=:id"), dict(id=cid)
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.scalar(
                    text("SELECT to_jsonb(c) FROM contact c WHERE id=:id"), dict(id=cid)
                ).items()
                >= before.items()
            )
        run(settings, database, token, booking(uid, cid, type="office"))
        assert migrate("downgrade", "0015_outcomes_reopening").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
