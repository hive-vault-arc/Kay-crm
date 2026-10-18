"""Lead distributions use the complete filtered scope before pagination."""

from datetime import UTC, datetime
from typing import get_args
from uuid import UUID

import pytest

from app.contacts.contracts import EnquiryStatus, ListQuery
from app.contacts.models import Contact
from app.contacts.queries import read_list
from app.identity.security import IdentityError
from tests.contact_support import actor, create_lead, new_lead

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_all_lead_states_count_before_paging_without_private_rows(settings, database):
    _, token = actor(settings, database)
    lead = create_lead(settings, database, token)
    contact_id = lead["contact"]["id"]
    for status in get_args(EnquiryStatus)[1:]:
        create_lead(
            settings,
            database,
            token,
            new_lead(contact_id=contact_id, new_contact=None, status=status),
        )
    _, outsider = actor(settings, database)
    create_lead(settings, database, outsider, new_lead("+212600000002", status="qualified"))
    expected = {status: 1 for status in get_args(EnquiryStatus)} | {"converted": 0}
    first = read_list(database, token, "enquiries", ListQuery(page_size=1))
    assert first["status_counts"] == expected
    assert first["total"] == sum(expected.values()) == 9 and len(first["items"]) == 1
    beyond = read_list(database, token, "enquiries", ListQuery(page=1000, page_size=1))
    assert beyond["items"] == [] and beyond["status_counts"] == expected
    one = read_list(database, token, "enquiries", ListQuery(status="follow_up"))
    assert one["total"] == one["status_counts"]["follow_up"] == 1
    assert sum(one["status_counts"].values()) == 1
    empty = read_list(database, token, "enquiries", ListQuery(source="email"))
    assert empty["total"] == 0 and sum(empty["status_counts"].values()) == 0
    private = read_list(database, outsider, "enquiries", ListQuery())
    assert private["total"] == private["status_counts"]["qualified"] == 1
    assert sum(private["status_counts"].values()) == 1
    _, manager = actor(settings, database, "manager")
    with database.session() as session, session.begin():
        session.get(Contact, UUID(contact_id)).archived_at = datetime.now(UTC)
    active = read_list(database, manager, "enquiries", ListQuery())
    assert active["total"] == active["status_counts"]["qualified"] == 1
    archived = read_list(database, manager, "enquiries", ListQuery(archive="archived"))
    assert archived["total"] == 9 and archived["status_counts"] == expected
    all_rows = read_list(database, manager, "enquiries", ListQuery(archive="all"))
    assert all_rows["total"] == sum(all_rows["status_counts"].values()) == 10
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        read_list(database, token, "enquiries", ListQuery(archive="all"))
