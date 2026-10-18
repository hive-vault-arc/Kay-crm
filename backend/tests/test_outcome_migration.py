"""SP-13 additive preservation and immutable-history downgrade refusal."""

import pytest
from sqlalchemy import text

from tests.contact_support import actor
from tests.deal_support import run
from tests.legacy_support import available_offering
from tests.legacy_support import contact as legacy_contact
from tests.legacy_support import deal as legacy_deal
from tests.legacy_support import property as legacy_property
from tests.test_isolation_migrations import migrate
from tests.test_outcomes import body

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_populated_0014_upgrade_and_retained_history_refuse_downgrade(settings, database):
    uid, token = actor(settings, database)
    manager_id, _ = actor(settings, database, "manager")
    assert migrate("downgrade", "0014_reservations").returncode == 0
    try:
        cid = legacy_contact(database, uid)
        pid = legacy_property(database, manager_id)
        oid = available_offering(database, manager_id, cid, pid)
        did = legacy_deal(database, uid, cid, oid)
        with database.engine.connect() as connection:
            before = connection.scalar(
                text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did}
            )
            offering = connection.scalar(
                text("SELECT to_jsonb(o) FROM offering o WHERE id=:id"), {"id": oid}
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.scalar(
                    text("SELECT to_jsonb(d) FROM deal d WHERE id=:id"), {"id": did}
                ).items()
                >= before.items()
            )
            assert (
                connection.scalar(
                    text("SELECT to_jsonb(o) FROM offering o WHERE id=:id"), {"id": oid}
                ).items()
                >= offering.items()
            )
        run(settings, database, token, body(database, token, did), did)
        assert migrate("downgrade", "0014_reservations").returncode != 0
        run(settings, database, token, body(database, token, did, reopen=True), did)
        assert migrate("downgrade", "0014_reservations").returncode != 0
    finally:
        assert migrate("upgrade", "head").returncode == 0
