"""Verify inventory intake dates and compatibility with existing edit clients."""

from datetime import date, datetime, timedelta
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.inventory.commands import command_payload
from app.inventory.contracts import EditProperty, InventoryQuery, PropertyFields
from app.inventory.hierarchy_contracts import DevelopmentFields, EditDevelopment
from app.inventory.queries import read_detail, read_history, read_list
from app.inventory.received_date import CASABLANCA
from tests.contact_support import actor
from tests.test_developments import read as read_development
from tests.test_inventory import run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("kind", ["property", "development"])
def test_received_date_is_optional_and_audited(settings, database, kind):
    agent, token = actor(settings, database)
    query = InventoryQuery()
    values = {"reference": "SYN-RECEIVED", "category": "apartment"}
    if kind == "property":
        create, edit = PropertyFields, EditProperty
    else:
        create, edit = DevelopmentFields, EditDevelopment
        values["name"] = "Programme synthétique"
    edit_operation = "edit-property" if kind == "property" else "development-edit"
    received = "2025-01-03"
    result = run(
        settings, database, token, f"create-{kind}", create(**values, received_on=received)
    )
    record_id = UUID(result[f"{kind}_id"])

    def detail():
        if kind == "property":
            return read_detail(database, token, record_id)
        return read_development(database, token, target=record_id)

    initial = detail()
    assert initial["received_on"] == received
    created_at = initial["created_at"]
    assert datetime.fromisoformat(created_at).date() > date.fromisoformat(received)

    legacy_edit = edit(**values, expected_version=initial["version"])
    assert "received_on" not in command_payload(legacy_edit)
    result = run(settings, database, token, edit_operation, legacy_edit, record_id)
    assert detail()["received_on"] == received
    cleared = edit(**values, expected_version=result["version"], received_on=None)
    assert command_payload(cleared)["received_on"] is None
    run(settings, database, token, edit_operation, cleared, record_id)
    assert detail()["received_on"] is None
    assert detail()["created_at"] == created_at

    if kind == "property":
        history = read_history(database, token, record_id, query)
        listing = read_list(database, token, "properties", query)
    else:
        history = read_development(database, token, "history", record_id)
        listing = read_development(database, token, "developments")
    assert len(listing["items"]) == 1
    assert "received_on" not in listing["items"][0]
    events = {item["reason"]: item for item in history["items"]}
    assert events["Date de réception : 03/01/2025 → non renseignée."]["actor"]["id"] == str(agent)
    assert "Date de réception : non renseignée → 03/01/2025." in events


@pytest.mark.parametrize("bad_date", ["2025-02-29", "2025-1-3", "2025-01-03T00:00:00Z", 20250103])
def test_received_date_rejects_malformed_values(bad_date):
    with pytest.raises(ValidationError, match="received_on"):
        PropertyFields(reference="SYN-INVALID", category="apartment", received_on=bad_date)


def test_received_date_accepts_today_but_rejects_tomorrow():
    today = datetime.now(CASABLANCA).date()
    fields = {"reference": "SYN-PROGRAMME", "name": "Programme synthétique"}
    assert DevelopmentFields(**fields, received_on=today).received_on == today
    with pytest.raises(ValidationError, match="received_on"):
        DevelopmentFields(**fields, received_on=today + timedelta(days=1))
