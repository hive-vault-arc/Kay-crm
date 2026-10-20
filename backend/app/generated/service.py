"""Scope-aware prefill, immutable PDF generation and private history."""

import hashlib
import json
import os
from datetime import UTC, datetime
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.contacts.models import Contact, ContactEmail, ContactPhone, Enquiry
from app.contacts.queries import enquiry_in_scope
from app.db.session import Database
from app.deals.access import authorized as authorized_deal
from app.deals.models import Deal
from app.files.contracts import MAX_FILE_BYTES
from app.files.models import Document, DocumentVersion, FileReceipt
from app.files.service import audit, authorize, locked_identity
from app.files.storage import PrivateStorage
from app.generated.catalog import BY_CODE, TEMPLATES, Template
from app.generated.contracts import GenerateRequest
from app.generated.render import render_pdf
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity, current_identity
from app.inventory.models import Offering, Property
from app.settings import Settings


def _parent(
    session: Session, identity: CurrentIdentity, kind: str, pid: UUID
) -> tuple[Contact, Enquiry | Deal]:
    record: Enquiry | Deal
    if kind == "enquiry":
        record = enquiry_in_scope(session, identity, pid)
    else:
        record = authorized_deal(session, identity, pid)
    return readable_contact(session, identity, record.contact_id), record


def _defaults(
    session: Session, identity: CurrentIdentity, contact: Contact, record: Enquiry | Deal
) -> dict[str, str]:
    phone = session.scalar(
        select(ContactPhone.normalized).where(
            ContactPhone.contact_id == contact.id,
            ContactPhone.is_primary,
            ContactPhone.archived_at.is_(None),
        )
    )
    email = session.scalar(
        select(ContactEmail.normalized).where(
            ContactEmail.contact_id == contact.id,
            ContactEmail.is_primary,
            ContactEmail.archived_at.is_(None),
        )
    )
    result = {
        "client_name": contact.name,
        "client_phone": phone or "",
        "client_email": email or "",
        "agent_name": identity.user.display_name,
        "budget": record.initial_budget or "",
    }
    if isinstance(record, Deal):
        result["property_description"] = record.title
        offering = session.get(Offering, record.offering_id) if record.offering_id else None
        if offering:
            if offering.price_mad is not None:
                result["price_mad"] = f"{offering.price_mad:.2f}"
            item = session.get(Property, offering.property_id) if offering.property_id else None
            if item:
                result["property_reference"] = item.reference
                result["property_address"] = item.location or ""
                result["property_area"] = f"{item.area_sqm:.2f}" if item.area_sqm else ""
                result["property_rooms"] = str(item.rooms) if item.rooms else ""
    return result


def _visible(identity: CurrentIdentity, template: Template) -> bool:
    return not template.restricted or identity.user.role in {"administrator", "manager"}


def context(database: Database, token: str, kind: str, pid: UUID) -> dict[str, object]:
    with database.session() as session:
        identity = current_identity(session, token)
        contact, record = _parent(session, identity, kind, pid)
        defaults = _defaults(session, identity, contact, record)
        return {
            "defaults": defaults,
            "can_generate": contact.archived_at is None and record.archived_at is None,
            "templates": [
                {
                    "code": item.code,
                    "title": item.title,
                    "warning": item.warning,
                    "fields": [
                        {
                            "key": field.key,
                            "label": field.label,
                            "group": field.group,
                            "multiline": field.multiline,
                        }
                        for field in item.fields
                    ],
                }
                for item in TEMPLATES
                if _visible(identity, item)
            ],
        }


def _row(session: Session, document: Document) -> dict[str, object]:
    version = session.scalar(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document.id, DocumentVersion.state == "clean")
        .order_by(DocumentVersion.created_at.desc(), DocumentVersion.id.desc())
        .limit(1)
    )
    if version is None:
        raise IdentityError("FILE_NOT_CLEAN", 409)
    return {
        "id": str(document.id),
        "template_code": document.template_code,
        "filename": document.filename,
        "size_bytes": document.size_bytes,
        "version": document.version,
        "version_id": str(version.id),
        "created_at": document.created_at.isoformat(),
    }


def history(database: Database, token: str, kind: str, pid: UUID, page: int) -> dict[str, object]:
    with database.session() as session:
        identity = current_identity(session, token)
        authorize(session, identity, kind, pid)
        column = Document.enquiry_id if kind == "enquiry" else Document.deal_id
        statement = select(Document).where(
            column == pid, Document.purpose == "generated", Document.archived_at.is_(None)
        )
        if identity.user.role == "agent":
            statement = statement.where(Document.template_code.not_in(("10", "11")))
        total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        rows = session.scalars(
            statement.order_by(Document.created_at.desc(), Document.id.desc())
            .offset((page - 1) * 20)
            .limit(20)
        ).all()
        return {
            "items": [_row(session, row) for row in rows],
            "page": page,
            "page_size": 20,
            "total": total,
            "has_next": page * 20 < total,
            "has_previous": page > 1,
        }


def generate(
    database: Database, settings: Settings, token: str, key: UUID, body: GenerateRequest
) -> dict[str, object]:
    template = BY_CODE[body.template_code]
    allowed = {field.key: field for field in template.fields}
    if set(body.values) - set(allowed) or any(
        len(value) > (1000 if allowed[name].multiline else 300)
        or (not allowed[name].multiline and "\n" in value)
        for name, value in body.values.items()
    ):
        raise IdentityError("VALIDATION_ERROR", 422)
    digest = hashlib.sha256(
        json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
    ).digest()
    with database.session() as session:
        identity = current_identity(session, token)
        if not _visible(identity, template):
            raise IdentityError("FORBIDDEN", 403)
        authorize(session, identity, body.parent_kind, body.parent_id, write=True)

    now = datetime.now(ZoneInfo("Africa/Casablanca"))
    document_id, version_id, object_key = uuid4(), uuid4(), uuid4()
    reference = document_id.hex[:8]
    payload = render_pdf(template, body.values, reference, now.strftime("%d/%m/%Y"))
    if not payload or len(payload) > MAX_FILE_BYTES:
        raise IdentityError("FILE_TOO_LARGE", 413)
    storage = PrivateStorage(settings)
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        receipt = session.get(FileReceipt, (identity.user.id, key))
        if receipt:
            if receipt.operation != "generate" or receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            authorize(session, identity, body.parent_kind, body.parent_id, write=True)
            previous = session.get(Document, receipt.document_id)
            if previous is None or getattr(previous, f"{body.parent_kind}_id") != body.parent_id:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return _row(session, previous)
        if not _visible(identity, template):
            raise IdentityError("FORBIDDEN", 403)
        authorize(session, identity, body.parent_kind, body.parent_id, write=True)
        filename = f"KAY-{template.code}-{reference}.pdf"
        document = Document(
            id=document_id,
            **{f"{body.parent_kind}_id": body.parent_id},
            filename=filename,
            mime_type="application/pdf",
            purpose="generated",
            template_code=template.code,
            size_bytes=len(payload),
            created_by_user_id=identity.user.id,
            version=1,
        )
        version = DocumentVersion(
            id=version_id,
            document_id=document_id,
            object_key=object_key,
            created_by_user_id=identity.user.id,
            size_bytes=len(payload),
            sha256=hashlib.sha256(payload).digest(),
            state="clean",
            scanned_at=datetime.now(UTC),
            scanner_version="server-generated",
        )
        session.add(document)
        session.flush()
        session.add(version)
        session.flush()
        temporary = storage.path(object_key, partial=True)
        try:
            with temporary.open("xb") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            storage.promote(object_key)
        except OSError:
            raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503) from None
        finally:
            if temporary.exists():
                temporary.unlink()
        audit(session, identity, document, "generated")
        session.add(
            FileReceipt(
                actor_id=identity.user.id,
                key=key,
                operation="generate",
                request_hash=digest,
                document_id=document_id,
            )
        )
        session.flush()
        return _row(session, document)
