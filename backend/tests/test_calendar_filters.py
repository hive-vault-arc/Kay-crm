"""Calendar facets are full-range scoped facts, not current-page or free/busy leaks."""

from uuid import UUID

import pytest
from pydantic import ValidationError

from app.identity.security import IdentityError
from app.schedule.contracts import CalendarQuery, VisitAction
from app.schedule.queries import read_visits
from tests.contact_support import actor
from tests.test_schedule import booking, prepared, run

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def period(**fields):
    return CalendarQuery(start_at="2030-01-07T00:00Z", end_at="2030-01-14T00:00Z", **fields)


def test_facets_span_all_pages_and_filters_combine_without_leaking_scope(settings, database):
    uid, token, cid, admin = prepared(settings, database)
    for index in range(51):
        run(
            settings,
            database,
            token,
            booking(uid, cid, type="office", status="draft", title=f"Visite synthétique {index}"),
        )
    car = run(settings, database, token, booking(uid, cid))
    run(settings, database, token, VisitAction(expected_version=1), UUID(car["id"]), "confirmed")
    first = read_visits(database, token, period(page_size=1))
    assert first["total"] == first["unfiltered_total"] == 52
    assert len(first["items"]) == 1 and first["type_counts"] == {
        "office": 51,
        "company_car": 1,
        "without_company_car": 0,
    }
    filtered = read_visits(database, token, period(types="company_car", statuses="confirmed"))
    assert filtered["total"] == 1 and filtered["items"][0]["id"] == car["id"]
    assert filtered["type_counts"] == first["type_counts"]
    assert filtered["status_counts"] == first["status_counts"]
    assert read_visits(database, token, period(types="office", statuses="confirmed"))["total"] == 0
    assert read_visits(database, token, period(types=""))["total"] == 0
    assert read_visits(database, token, period(statuses=""))["total"] == 0
    assert read_visits(database, admin, period())["unfiltered_total"] == 52
    _, outsider = actor(settings, database)
    hidden = read_visits(database, outsider, period())
    assert hidden["total"] == hidden["unfiltered_total"] == 0
    assert all(count == 0 for count in hidden["type_counts"].values())
    assert all(count == 0 for count in hidden["status_counts"].values())


@pytest.mark.parametrize(
    "fields",
    [
        {"types": "office,office"},
        {"types": "driver"},
        {"types": "office,"},
        {"statuses": "scheduled,confirmed,scheduled"},
        {"statuses": "active"},
        {"types": " office"},
    ],
)
def test_filter_vocabulary_is_bounded_exact_and_unique(fields):
    with pytest.raises(ValidationError):
        period(**fields)


@pytest.mark.parametrize("fields", [{"types": "office"}, {"statuses": "confirmed"}, {"types": ""}])
def test_free_busy_does_not_expose_private_type_or_status_facets(settings, database, fields):
    _, token = actor(settings, database)
    with pytest.raises(IdentityError, match="VALIDATION_ERROR"):
        read_visits(database, token, period(**fields), busy=True)
