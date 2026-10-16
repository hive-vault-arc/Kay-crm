"""Supervisor diagnostics expose only aggregate queue metadata, never export contents."""

import json
from uuid import uuid4

import pytest

from app.discovery.contracts import NewExport
from app.discovery.export_worker import claim, finish
from app.discovery.exports import request_export
from tests.contact_support import actor
from tests.queue_status import export_queue

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_export_queue_probe_is_read_only_and_contains_no_record_identifiers(settings, database):
    assert export_queue(database) == {"undispatched": 0, "jobs": []}
    uid, token = actor(settings, database, "manager")
    row = request_export(database, token, uuid4(), NewExport())
    assert export_queue(database) == {"undispatched": 1, "jobs": []}
    jid, fence, eid = claim(database)
    finish(database, jid, fence, eid, None, error="FILE_STORAGE_UNAVAILABLE")
    expected = {
        "undispatched": 0,
        "jobs": [dict(state="retry", error="FILE_STORAGE_UNAVAILABLE", count=1)],
    }
    assert export_queue(database) == expected
    assert export_queue(database) == expected
    rendered = json.dumps(expected)
    assert str(uid) not in rendered and row["id"] not in rendered and token not in rendered
