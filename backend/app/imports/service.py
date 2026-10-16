import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, responsible_agent
from app.contacts.history_models import AssignmentEvent, TimelineEvent
from app.contacts.models import Contact, ContactEmail, ContactPhone, ContactRole
from app.db.session import Database
from app.files.storage import PrivateStorage
from app.identity.models import AuditEvent
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.imports.access import authorized, batch_for
from app.imports.contracts import Approve, NewBatch, Preview
from app.imports.models import ImportBatch, ImportPreview, ImportRow
from app.imports.parsing import parse_csv
from app.imports.queries import rows_in, summary
from app.imports.validation import ValidatedRow, apply_preview, snapshot_hash, validate_rows
from app.settings import Settings


def create_batch(database: Database, token: str, key: UUID, body: NewBatch) -> dict[str, object]:
    with database.session() as session, session.begin():
        identity = authorized(session, token, lock=True)
        batch = session.scalar(
            select(ImportBatch).where(
                ImportBatch.author_user_id == identity.user.id, ImportBatch.create_key == key
            )
        )
        if batch:
            if batch.filename != body.filename or batch.size_bytes != body.size_bytes:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
        else:
            batch = ImportBatch(
                author_user_id=identity.user.id,
                create_key=key,
                filename=body.filename,
                size_bytes=body.size_bytes,
            )
            session.add(batch)
            session.flush()
            session.add(AuditEvent(actor_user_id=identity.user.id, action="imports.created"))
        return summary(batch)


def preview(
    database: Database, settings: Settings, token: str, bid: UUID, body: Preview
) -> dict[str, object]:
    with database.session() as session, session.begin():
        identity = authorized(session, token, lock=True)
        batch = batch_for(session, bid, lock=True)
        if batch.state == "committed":
            raise IdentityError("IMPORT_ALREADY_APPROVED", 409)
        if (
            batch.state not in {"uploaded", "previewed", "repreview_required"}
            or not batch.object_key
        ):
            raise IdentityError("IMPORT_UPLOAD_REQUIRED", 409)
        raw = PrivateStorage(settings).read(batch.object_key, batch.size_bytes, batch.file_hash)
        parsed = parse_csv(raw)
        rows = rows_in(session, bid)
        if not rows:
            rows = [
                ImportRow(batch_id=bid, row_number=i + 2, values=v, errors=[], status="invalid")
                for i, v in enumerate(parsed)
            ]
            session.add_all(rows)
        if len({v.row_number for v in body.row_agents}) != len(body.row_agents):
            raise IdentityError("VALIDATION_ERROR", 422)
        by_number = {row.row_number: row for row in rows}
        for value in body.row_agents:
            if value.row_number not in by_number:
                raise IdentityError("VALIDATION_ERROR", 422)
            if value.agent_id:
                responsible_agent(session, identity, value.agent_id)
            by_number[value.row_number].override_agent_id = value.agent_id
        if body.fallback_agent_id:
            responsible_agent(session, identity, body.fallback_agent_id)
        batch.fallback_agent_id = body.fallback_agent_id
        batch.version += 1
        values = validate_rows(session, batch, rows)
        apply_preview(batch, values)
        batch.state = "previewed"
        session.add(
            ImportPreview(
                batch_id=bid,
                version=batch.version,
                preview_hash=batch.preview_hash,
                counts=batch.counts,
                actor_user_id=identity.user.id,
            )
        )
        session.add(AuditEvent(actor_user_id=identity.user.id, action="imports.previewed"))
        session.flush()
        return summary(batch)


def insert_contacts(
    session: Session, identity: CurrentIdentity, batch: ImportBatch, values: list[ValidatedRow]
) -> None:
    eligible = [v for v in values if v.status == "eligible"]
    for offset in range(0, len(eligible), 500):
        group = eligible[offset : offset + 500]
        contacts = []
        for value in group:
            if not value.contact or not value.agent:
                raise IdentityError("INVALID_IMPORT_ROWS", 422)
            cid = uuid4()
            value.row.contact_id, value.row.status = cid, "committed"
            contacts.append(
                Contact(
                    id=cid,
                    name=value.contact.name,
                    type="person",
                    primary_agent_id=value.agent.id,
                    created_by_user_id=identity.user.id,
                    source="csv_import",
                    source_submission_id=batch.id,
                )
            )
        session.add_all(contacts)
        session.flush()
        for value, contact in zip(group, contacts, strict=True):
            if not value.contact or not value.agent:
                raise IdentityError("INVALID_IMPORT_ROWS", 422)
            for phone in value.contact.phones:
                session.add(
                    ContactPhone(
                        contact_id=contact.id,
                        origin_contact_id=contact.id,
                        normalized=phone.number,
                        label="",
                        is_primary=phone.is_primary,
                        created_by_user_id=identity.user.id,
                    )
                )
            for email in value.contact.emails:
                session.add(
                    ContactEmail(
                        contact_id=contact.id,
                        origin_contact_id=contact.id,
                        normalized=email.email,
                        label="",
                        is_primary=email.is_primary,
                        created_by_user_id=identity.user.id,
                    )
                )
            session.add_all(
                ContactRole(contact_id=contact.id, role=role) for role in value.contact.roles
            )
            session.add(
                TimelineEvent(
                    contact_id=contact.id,
                    actor_user_id=identity.user.id,
                    actor_name=identity.user.display_name,
                    action="contacts.created",
                    body=value.row.values["notes"],
                    reason="Import CSV",
                )
            )
            session.add(
                AssignmentEvent(
                    contact_id=contact.id,
                    actor_user_id=identity.user.id,
                    actor_name=identity.user.display_name,
                    action="primary",
                    new_user_id=value.agent.id,
                    new_name=value.agent.display_name,
                    reason="Import CSV",
                )
            )
            session.add(
                AuditEvent(
                    actor_user_id=identity.user.id,
                    contact_id=contact.id,
                    action="contacts.imported",
                )
            )
        session.flush()


def require_repreview(batch: ImportBatch) -> None:
    batch.state, batch.preview_hash = "repreview_required", None


def approve(
    database: Database, token: str, bid: UUID, key: UUID, body: Approve
) -> dict[str, object]:
    digest = hashlib.sha256(
        json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
    ).digest()
    failed = False
    try:
        with database.session() as session, session.begin():
            identity = authorized(session, token, lock=True)
            batch = batch_for(session, bid, lock=True)
            if batch.state == "committed":
                if batch.approval_key != key or batch.approval_hash != digest:
                    raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
                return summary(batch)
            if batch.state != "previewed" or batch.preview_hash != body.preview_hash:
                raise IdentityError("IMPORT_REPREVIEW_REQUIRED", 409)
            if body.fallback_agent_id != batch.fallback_agent_id:
                raise IdentityError("IMPORT_REPREVIEW_REQUIRED", 409)
            rows = rows_in(session, bid)
            try:
                values = validate_rows(session, batch, rows)
            except IdentityError as error:
                if error.code != "INVALID_ASSIGNEE":
                    raise
                values = []
            if not values:
                require_repreview(batch)
                failed = True
            elif snapshot_hash(batch, values) != body.preview_hash:
                require_repreview(batch)
                failed = True
            elif any(v.status == "invalid" for v in values):
                raise IdentityError("INVALID_IMPORT_ROWS", 422)
            else:
                numbers = sorted({p for v in values if v.status == "eligible" for p in v.phones})
                buckets = sorted(
                    {
                        int.from_bytes(hashlib.sha256(number.encode()).digest()[:2]) % 1024
                        for number in numbers
                    }
                )
                for bucket in buckets:
                    session.execute(
                        text("SELECT pg_advisory_xact_lock(1801, :bucket)"),
                        {"bucket": bucket},
                    )
                # Unique phones also reject claimants that bypass the agency command lock.
                insert_contacts(session, identity, batch, values)
                batch.state, batch.approval_key, batch.approval_hash = "committed", key, digest
                batch.approved_by_user_id, batch.approved_at = identity.user.id, datetime.now(UTC)
                batch.counts = batch.counts | {"committed": batch.counts["eligible"], "eligible": 0}
                batch.result = {
                    "batch_id": str(bid),
                    "committed": batch.counts["committed"],
                    "skipped_existing": batch.counts["skipped_existing"],
                    "approved_at": batch.approved_at.isoformat(),
                    "approved_by_user_id": str(identity.user.id),
                }
                session.add(AuditEvent(actor_user_id=identity.user.id, action="imports.approved"))
            session.flush()
            result = summary(batch)
    except IntegrityError as error:
        if getattr(error.orig, "sqlstate", None) != "23505":
            raise
        with database.session() as session, session.begin():
            authorized(session, token, lock=True)
            batch = batch_for(session, bid, lock=True)
            if batch.state != "committed":
                require_repreview(batch)
        failed = True
    if failed:
        raise ContactConflict("IMPORT_REPREVIEW_REQUIRED", {})
    return result
