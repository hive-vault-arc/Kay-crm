import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.contracts import NewContact
from app.contacts.models import ContactPhone
from app.identity.models import Credential, User
from app.identity.security import IdentityError, normalize_email
from app.identity.sessions import credential_active
from app.imports.models import ImportBatch, ImportRow
from app.imports.parsing import duplicates, row_contact


@dataclass
class ValidatedRow:
    row: ImportRow
    contact: NewContact | None
    errors: list[str]
    phones: set[str]
    status: str = "invalid"
    agent: User | None = None


def validate_rows(
    session: Session, batch: ImportBatch, rows: list[ImportRow]
) -> list[ValidatedRow]:
    now = datetime.now(UTC)
    agents = {
        user.id: user
        for user, credential in session.execute(
            select(User, Credential).join(Credential).where(User.role == "agent")
        )
        if credential_active(user, credential, now) and not credential.must_change_password
    }
    by_email = {u.email: u for u in agents.values()}
    if batch.fallback_agent_id and batch.fallback_agent_id not in agents:
        raise IdentityError("INVALID_ASSIGNEE", 422)
    validated = [ValidatedRow(row, *row_contact(row.values)) for row in rows]
    numbers = sorted(set().union(*(v.phones for v in validated)))
    existing: set[str] = set()
    for offset in range(0, len(numbers), 10000):
        existing.update(
            session.scalars(
                select(ContactPhone.normalized).where(
                    ContactPhone.archived_at.is_(None),
                    ContactPhone.normalized.in_(numbers[offset : offset + 10000]),
                )
            )
        )
    repeated = duplicates([v.phones for v in validated if not v.phones & existing])
    for value in validated:
        if value.phones & existing:
            value.status, value.errors = "skipped_existing", []
            continue
        row = value.row
        if row.override_agent_id:
            value.agent = agents.get(row.override_agent_id)
        elif row.values["agent_email"]:
            try:
                value.agent = by_email.get(normalize_email(row.values["agent_email"]))
            except IdentityError:
                pass
        elif batch.fallback_agent_id:
            value.agent = agents.get(batch.fallback_agent_id)
        if not value.agent:
            value.errors.append("INVALID_OR_MISSING_AGENT")
        if value.phones & repeated:
            value.errors.append("DUPLICATE_NEW_PHONE")
        value.status = "invalid" if value.errors else "eligible"
    return validated


def snapshot_hash(batch: ImportBatch, values: list[ValidatedRow]) -> str:
    payload = {
        "batch_id": str(batch.id),
        "file_hash": batch.file_hash.hex() if batch.file_hash else None,
        "version": batch.version,
        "fallback_agent_id": str(batch.fallback_agent_id) if batch.fallback_agent_id else None,
        "rows": [
            {
                "number": v.row.row_number,
                "status": v.status,
                "errors": v.errors,
                "contact": v.contact.model_dump(mode="json") if v.contact else None,
                "agent": str(v.agent.id) if v.agent else None,
            }
            for v in values
        ],
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()


def apply_preview(batch: ImportBatch, values: list[ValidatedRow]) -> None:
    counts = {key: 0 for key in ("eligible", "invalid", "skipped_existing", "committed")}
    for value in values:
        row = value.row
        row.status, row.errors = value.status, value.errors
        row.normalized = value.contact.model_dump(mode="json") if value.contact else None
        row.agent_id = value.agent.id if value.agent else None
        row.agent_name = value.agent.display_name if value.agent else None
        counts[value.status] += 1
    batch.counts = counts
    batch.preview_hash = snapshot_hash(batch, values)
