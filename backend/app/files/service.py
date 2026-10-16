"""Short authoritative transactions for file metadata, permits and publication."""

import hashlib
import json
import re
import secrets
from datetime import UTC, datetime, timedelta
from pathlib import PurePosixPath
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact, scoped_contact
from app.db.session import Database
from app.deals.access import authorized as authorized_deal
from app.deals.access import writable as writable_deal
from app.files.contracts import FORMATS, ArchiveDocument, NewDocument, PermitRequest
from app.files.models import Document, DocumentVersion, FilePermit, FileReceipt, Job, OutboxEvent
from app.identity.models import AGENCY_ID, Agency, AuditEvent, User
from app.identity.security import IdentityError, token_hash
from app.identity.sessions import (
    CurrentIdentity,
    current_identity,
    identity_for_session,
    require_role,
)
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property


def locked_identity(
    session: Session, token: str | None = None, sid: UUID | None = None
) -> CurrentIdentity:
    session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
    if token is None and sid is None:
        raise IdentityError("UNAUTHENTICATED", 401)
    identity = (
        current_identity(session, token)
        if token is not None
        else identity_for_session(session, cast(UUID, sid))
    )
    session.scalars(select(User).where(User.id == identity.user.id).with_for_update()).all()
    session.expire_all()
    return (
        current_identity(session, token)
        if token is not None
        else identity_for_session(session, identity.session.id)
    )


def authorize(
    session: Session, identity: CurrentIdentity, kind: str, target: UUID, *, write: bool = False
) -> None:
    if kind == "contact":
        (scoped_contact if write else readable_contact)(session, identity, target)
        return
    if kind == "deal":
        deal = authorized_deal(session, identity, target)
        if write:
            writable_deal(session, identity, deal)
        return
    model = {"development": Development, "property": Property}.get(kind)
    if model is None:
        raise IdentityError("VALIDATION_ERROR", 422)
    if write:
        require_role(identity, {"manager"})
    item = cast(Development | Property | None, session.get(model, target))
    if item is None or item.archived_at is not None:
        raise IdentityError("NOT_FOUND", 404)


def parent(document: Document) -> tuple[str, UUID]:
    for kind in ("contact", "development", "property", "deal"):
        value = getattr(document, f"{kind}_id")
        if value is not None:
            return kind, UUID(str(value))
    raise IdentityError("NOT_FOUND", 404)


def authorized_document(
    session: Session, identity: CurrentIdentity, did: UUID, *, write: bool = False
) -> Document:
    document = session.get(Document, did)
    if document is None:
        raise IdentityError("NOT_FOUND", 404)
    authorize(session, identity, *parent(document), write=write)
    return document


def audit(session: Session, identity: CurrentIdentity, document: Document, action: str) -> None:
    session.add(
        AuditEvent(
            actor_user_id=identity.user.id,
            action=f"documents.{action}:{document.id}",
            contact_id=document.contact_id,
            development_id=document.development_id,
            property_id=document.property_id,
            deal_id=document.deal_id,
        )
    )


def view(session: Session, document: Document) -> dict[str, object]:
    versions = session.scalars(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document.id)
        .order_by(DocumentVersion.created_at.desc(), DocumentVersion.id.desc())
        .limit(49)
    ).all()
    if not any(item.state == "clean" for item in versions):
        previous = session.scalar(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document.id, DocumentVersion.state == "clean")
            .order_by(DocumentVersion.created_at.desc(), DocumentVersion.id.desc())
            .limit(1)
        )
        if previous is not None:
            versions = [*versions, previous]
    return {
        "id": str(document.id),
        "filename": document.filename,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "version": document.version,
        "archived": document.archived_at is not None,
        "versions": [
            {
                "id": str(v.id),
                "state": v.state,
                "scan_error": v.scan_error,
                "created_at": v.created_at.isoformat(),
            }
            for v in versions
        ],
    }


def read_document(database: Database, token: str, did: UUID) -> dict[str, object]:
    with database.session() as session:
        return view(session, authorized_document(session, current_identity(session, token), did))


def list_documents(
    database: Database, token: str, kind: str, pid: UUID, page: int, page_size: int
) -> dict[str, object]:
    with database.session() as session:
        identity = current_identity(session, token)
        authorize(session, identity, kind, pid)
        column = {
            "contact": Document.contact_id,
            "deal": Document.deal_id,
            "development": Document.development_id,
            "property": Document.property_id,
        }[kind]
        statement = select(Document).where(column == pid, Document.archived_at.is_(None))
        total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        rows = session.scalars(
            statement.order_by(Document.created_at.desc(), Document.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return {
            "items": [view(session, row) for row in rows],
            "page": page,
            "page_size": page_size,
            "total": total,
            "has_next": page * page_size < total,
            "has_previous": page > 1,
        }


def document_command(
    database: Database,
    token: str,
    key: UUID,
    body: NewDocument | ArchiveDocument,
    did: UUID | None = None,
    action: str = "archive",
) -> dict[str, object]:
    operation = action if did else "create"
    digest = hashlib.sha256(
        json.dumps(body.model_dump(mode="json"), sort_keys=True).encode()
    ).digest()
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        receipt = session.get(FileReceipt, (identity.user.id, key))
        if receipt:
            document = authorized_document(session, identity, receipt.document_id, write=True)
            if receipt.operation != f"{operation}:{did}" or receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return view(session, document)
        if isinstance(body, NewDocument):
            authorize(session, identity, body.parent_kind, body.parent_id, write=True)
            if FORMATS[PurePosixPath(body.filename).suffix.lower()] != body.mime_type:
                raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415)
            document = Document(
                id=uuid4(),
                **{f"{body.parent_kind}_id": body.parent_id},
                origin_contact_id=body.parent_id if body.parent_kind == "contact" else None,
                filename=body.filename,
                mime_type=body.mime_type,
                size_bytes=body.size_bytes,
                created_by_user_id=identity.user.id,
                version=1,
            )
            session.add(document)
            session.flush()
        else:
            assert did is not None  # noqa: S101
            document = authorized_document(session, identity, did, write=True)
            if document.version != body.expected_version:
                raise IdentityError("FILE_VERSION_CONFLICT", 409)
            if operation == "retry-scan":
                retry_scan(session, document)
            else:
                document.archived_at = datetime.now(UTC)
            document.version += 1
        audit(session, identity, document, operation)
        session.add(
            FileReceipt(
                actor_id=identity.user.id,
                key=key,
                operation=f"{operation}:{did}",
                request_hash=digest,
                document_id=document.id,
            )
        )
        session.flush()
        return view(session, document)


def retry_scan(session: Session, document: Document) -> None:
    if document.archived_at:
        raise IdentityError("NOT_FOUND", 404)
    version = session.scalar(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document.id, DocumentVersion.state == "pending_scan")
        .order_by(DocumentVersion.created_at.desc())
        .limit(1)
    )
    if version is None:
        raise IdentityError("FILE_SCAN_NOT_PENDING", 409)
    job = session.scalar(
        select(Job)
        .join(OutboxEvent, OutboxEvent.id == Job.outbox_id)
        .where(OutboxEvent.version_id == version.id)
        .with_for_update(of=Job)
    )
    session.refresh(version, with_for_update=True)
    if version.state != "pending_scan":
        raise IdentityError("FILE_SCAN_NOT_PENDING", 409)
    if job is not None:
        if job.state == "running" and job.lease_until and job.lease_until > datetime.now(UTC):
            raise IdentityError("FILE_SCAN_IN_PROGRESS", 409)
        job.state, job.attempts, job.lease_token, job.lease_until = "retry", 0, None, None
        job.available_at, job.error_code = datetime.now(UTC), None
    version.scan_error = None


def issue_permit(
    database: Database, token: str, body: PermitRequest, session_binding: str
) -> dict[str, object]:
    if not re.fullmatch(r"[a-f0-9]{64}", session_binding):
        raise IdentityError("FORBIDDEN", 403)
    with database.session() as session, session.begin():
        identity = locked_identity(session, token)
        document = authorized_document(
            session, identity, body.document_id, write=body.action == "upload"
        )
        if document.archived_at is not None:
            raise IdentityError("NOT_FOUND", 404)
        if document.version != body.expected_version:
            raise IdentityError("FILE_VERSION_CONFLICT", 409)
        now = datetime.now(UTC)
        recent = (
            session.scalar(
                select(func.count())
                .select_from(FilePermit)
                .where(
                    FilePermit.session_id == identity.session.id,
                    FilePermit.created_at > now - timedelta(minutes=1),
                )
            )
            or 0
        )
        if recent >= 30:
            raise IdentityError("RATE_LIMITED", 429)
        version: DocumentVersion | None
        if body.action == "upload":
            if body.version_id is not None:
                raise IdentityError("VALIDATION_ERROR", 422)
            version = DocumentVersion(
                id=uuid4(),
                document_id=document.id,
                created_by_user_id=identity.user.id,
                size_bytes=document.size_bytes,
                state="awaiting_upload",
            )
            session.add(version)
            document.version += 1
            session.flush()
        else:
            version = session.get(DocumentVersion, body.version_id) if body.version_id else None
            if version is None or version.document_id != document.id or version.state != "clean":
                raise IdentityError("FILE_NOT_CLEAN", 409)
        raw = secrets.token_urlsafe(32)
        permit = FilePermit(
            id=uuid4(),
            token_hash=token_hash(raw),
            session_proof_hash=token_hash(session_binding),
            session_id=identity.session.id,
            version_id=version.id,
            action=body.action,
            size_bytes=version.size_bytes,
            created_at=now,
            expires_at=now + timedelta(minutes=2),
        )
        session.add(permit)
        return {
            "permit_id": str(permit.id),
            "token": raw,
            "expires_at": permit.expires_at.isoformat(),
            "version_id": str(version.id),
            "document_version": document.version,
        }


def consume_permit(
    database: Database, pid: UUID, raw: str, action: str, session_binding: str
) -> tuple[UUID, UUID, str, str, int, UUID]:
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        permit = session.scalar(select(FilePermit).where(FilePermit.id == pid).with_for_update())
        if (
            permit is None
            or not secrets.compare_digest(permit.token_hash, token_hash(raw))
            or not secrets.compare_digest(permit.session_proof_hash, token_hash(session_binding))
            or permit.action != action
            or permit.expires_at <= datetime.now(UTC)
            or permit.consumed_at
        ):
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        identity = locked_identity(session, sid=permit.session_id)
        version = session.get(DocumentVersion, permit.version_id)
        if version is None:
            raise IdentityError("NOT_FOUND", 404)
        document = authorized_document(
            session, identity, version.document_id, write=action == "upload"
        )
        if document.archived_at or (action == "download" and version.state != "clean"):
            raise IdentityError("FILE_NOT_CLEAN", 409)
        if action == "upload" and version.state != "awaiting_upload":
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        permit.consumed_at = datetime.now(UTC)
        audit(session, identity, document, f"{action}-authorized")
        return (
            version.id,
            version.object_key,
            document.filename,
            document.mime_type,
            version.size_bytes,
            permit.session_id,
        )


def publish_upload(database: Database, vid: UUID, sid: UUID, digest: bytes) -> None:
    with database.session() as session, session.begin():
        identity = locked_identity(session, sid=sid)
        version = session.get(DocumentVersion, vid)
        if version is None or version.state != "awaiting_upload":
            raise IdentityError("FILE_PERMIT_INVALID", 403)
        document = authorized_document(session, identity, version.document_id, write=True)
        if document.archived_at:
            raise IdentityError("NOT_FOUND", 404)
        version.sha256, version.state = digest, "pending_scan"
        session.add(OutboxEvent(kind="file.scan", version_id=vid, dedupe_key=f"file.scan:{vid}"))
        audit(session, identity, document, "uploaded")
