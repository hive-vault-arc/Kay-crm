"""Database-forbidden notes contracts, legacy projections and command field ownership."""

from datetime import UTC, datetime
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError
from starlette.requests import Request

from app.identity.security import IdentityError
from app.schedule import commands, records
from app.schedule.contracts import EditVisit, FinishVisit, NewVisit, VisitAction
from app.schedule.models import Visit, VisitEvent
from app.schedule.presentation import notes_projection
from app.schedule.router import notes_enabled


def fields() -> dict[str, object]:
    return {
        "title": "Visite synthétique",
        "type": "office",
        "location": "Bureau synthétique",
        "start_at": "2030-01-07T10:00:00Z",
        "end_at": "2030-01-07T11:00:00Z",
        "participant_ids": [str(uuid4())],
    }


def test_notes_are_bounded_optional_text_distinct_from_command_reasons() -> None:
    body = EditVisit.model_validate(fields() | {"expected_version": 1})
    assert body.notes == "" and "notes" not in body.model_fields_set
    assert EditVisit.model_validate(
        body.model_dump() | {"notes": "  Ligne 1\nLigne 2  "}
    ).notes == ("Ligne 1\nLigne 2")
    for value in (None, 23, "x" * 1001):
        with pytest.raises(ValidationError):
            EditVisit.model_validate(body.model_dump() | {"notes": value})
    with pytest.raises(ValidationError):
        FinishVisit.model_validate({"expected_version": 1, "reason": "Résultat", "notes": "test"})


def test_omitted_notes_preserve_existing_receipt_body_identity() -> None:
    body = NewVisit.model_validate(fields() | {"contact_id": str(uuid4())})
    payload = commands.command_payload(body)
    assert payload == {
        key: value for key, value in body.model_dump(mode="json").items() if key != "notes"
    }
    explicit = NewVisit.model_validate(body.model_dump() | {"notes": ""})
    assert commands.command_payload(explicit) == payload | {"notes": ""}
    assert commands.command_payload(VisitAction(expected_version=2)) == {
        "expected_version": 2,
        "reason": "",
    }


def test_legacy_projection_does_not_mutate_stored_history_or_invent_old_notes() -> None:
    stored = {"notes": "Privé synthétique", "title": "Visite", "participant_ids": []}
    result = {"items": [{"snapshot": stored, "reason": "Chevauchement"}]}
    legacy = notes_projection(result, enabled=False)
    assert legacy == {
        "items": [
            {"snapshot": {"title": "Visite", "participant_ids": []}, "reason": "Chevauchement"}
        ]
    }
    assert stored["notes"] == "Privé synthétique"
    assert notes_projection(result, enabled=True) is result
    assert notes_projection({"notes": "Texte", "title": "Visite"}, enabled=False) == {
        "title": "Visite"
    }
    historic = {"snapshot": {"title": "Avant la migration"}}
    assert notes_projection({"items": [historic]}, enabled=True)["items"] == [historic]


def test_notes_response_opt_in_uses_only_the_exact_header_value() -> None:
    for value in (b"", b"0", b"true", b"1", b"2"):
        request = Request({"type": "http", "headers": [(b"x-kay-visit-notes", value)]})
        assert notes_enabled(request) is (value == b"1")
    result = {"items": [{"id": "synthetic", "notes": "Synthétique"}], "total": 1}
    assert notes_projection(result, enabled=False) == {"items": [{"id": "synthetic"}], "total": 1}


@pytest.mark.parametrize("edit", [{}, {"notes": ""}, {"notes": "Préparation synthétique"}])
def test_edit_retains_or_explicitly_replaces_notes_in_the_actual_history(monkeypatch, edit) -> None:
    actor, contact, participant = uuid4(), uuid4(), uuid4()
    row = Visit(
        id=uuid4(),
        contact_id=contact,
        origin_contact_id=contact,
        organizer_user_id=actor,
        title="Visite",
        type="office",
        status="scheduled",
        location="Bureau",
        start_at=datetime(2030, 1, 7, 10, tzinfo=UTC),
        end_at=datetime(2030, 1, 7, 11, tzinfo=UTC),
        notes="Notes existantes",
        overlap_reason="Explication distincte",
        outcome="",
        version=1,
        policy_version=1,
        schedule_version=1,
        updated_by_user_id=actor,
    )
    added = []
    session = SimpleNamespace(
        add=added.append,
        add_all=lambda rows: added.extend(rows),
        flush=lambda: None,
        execute=lambda *args, **kwargs: None,
    )
    identity = SimpleNamespace(user=SimpleNamespace(id=actor, display_name="Acteur synthétique"))
    monkeypatch.setattr(commands, "authorized", lambda *args, **kwargs: row)
    monkeypatch.setattr(commands, "check_context", lambda *args, **kwargs: None)
    monkeypatch.setattr(commands, "booking_check", lambda *args: None)
    monkeypatch.setattr(commands, "policy_view", lambda *args: {"version": 1})
    monkeypatch.setattr(commands, "synchronize", lambda *args: None)
    monkeypatch.setattr(records, "participants", lambda *args: [participant])
    monkeypatch.setattr(records, "record", lambda *args, **kwargs: None)
    body = EditVisit.model_validate(
        fields()
        | {
            "expected_version": 1,
            "participant_ids": [participant],
            "overlap_reason": "Autre explication",
        }
        | edit
    )
    changed = commands.apply_visit(session, identity, body, row.id, "rescheduled")
    expected = edit.get("notes", "Notes existantes")
    assert changed.notes == expected and changed.outcome == ""
    event = next(value for value in added if isinstance(value, VisitEvent))
    assert event.snapshot["notes"] == expected
    assert event.reason == "Autre explication" and event.actor_user_id == actor
    assert changed.version == 2
    # Terminal commands preserve notes and store their result separately.
    monkeypatch.setattr(commands, "participants", lambda *args: [participant])
    commands.apply_visit(
        session, identity, FinishVisit(expected_version=2, reason="Résultat"), row.id, "completed"
    )
    assert row.notes == expected and row.outcome == "Résultat"


def test_notes_do_not_bypass_current_write_authority(monkeypatch) -> None:
    def denied(*args, **kwargs):
        raise IdentityError("FORBIDDEN", 403)

    monkeypatch.setattr(commands, "authorized", denied)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        commands.apply_visit(
            None,
            None,
            EditVisit.model_validate(fields() | {"notes": "Texte", "expected_version": 1}),
            uuid4(),
            "updated",
        )


def test_notes_migration_is_additive_and_refuses_retained_data_downgrade(monkeypatch) -> None:
    spec = spec_from_file_location(
        "visit_notes_migration", Path(__file__).parents[1] / "alembic/versions/0036_visit_notes.py"
    )
    assert spec is not None and spec.loader is not None
    migration = module_from_spec(spec)
    spec.loader.exec_module(migration)
    added, executed, removed = [], [], []
    retained = True
    operation = SimpleNamespace(
        add_column=lambda *args: added.append(args),
        execute=executed.append,
        get_bind=lambda: SimpleNamespace(scalar=lambda *args: retained),
        drop_column=lambda *args: removed.append(args),
    )
    monkeypatch.setattr(migration, "op", operation)
    migration.upgrade()
    assert added[0][0] == "visit" and added[0][1].name == "notes"
    assert not added[0][1].nullable and added[0][1].type.length == 1000
    assert "DEFERRABLE INITIALLY DEFERRED" in executed[0]
    assert "stored IS DISTINCT FROM v.notes" in executed[0]
    monkeypatch.setattr(migration, "load_settings", lambda: SimpleNamespace(app_environment="test"))
    with pytest.raises(RuntimeError, match="DATA_DOWNGRADE_REFUSED"):
        migration.downgrade()
    assert not removed
    retained = False
    monkeypatch.setattr(
        migration, "load_settings", lambda: SimpleNamespace(app_environment="development")
    )
    with pytest.raises(RuntimeError, match="DATA_DOWNGRADE_REFUSED"):
        migration.downgrade()
    assert not removed
