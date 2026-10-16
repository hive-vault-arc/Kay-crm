"""Direct SQL cannot silently restore committed stock or rewrite its terms/history."""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from tests.deal_support import run
from tests.test_outcomes import body
from tests.test_reservations import fixture

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("operation", ["state", "price", "period", "delete", "retarget", "history"])
def test_committed_stock_and_outcomes_require_explicit_reopen(settings, database, operation):
    _, token, _, _, _, oid, did = fixture(settings, database)
    run(settings, database, token, body(database, token, did), did)
    sql = {
        "state": "UPDATE offering SET state='available' WHERE id=:oid",
        "price": "UPDATE offering SET price_mad=999 WHERE id=:oid",
        "period": "UPDATE offering SET price_period='year' WHERE id=:oid",
        "delete": "DELETE FROM deal_outcome WHERE deal_id=:did",
        "retarget": "UPDATE deal SET offering_id=NULL WHERE id=:did",
        "history": "DELETE FROM stock_effect WHERE offering_id=:oid",
    }[operation]
    with pytest.raises(IntegrityError), database.engine.begin() as connection:
        connection.execute(text(sql), {"oid": oid, "did": did})
