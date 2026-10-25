"""Ordinary facade metadata and direct, CORS-restricted binary permit transfers."""

import asyncio
import hashlib
import os
from collections.abc import Iterator
from typing import Annotated, Literal, cast
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from app.db.session import Database
from app.files.contracts import MAX_FILE_BYTES, ArchiveDocument, NewDocument, PermitRequest
from app.files.models import DocumentVersion
from app.files.service import (
    authorized_document,
    consume_permit,
    document_command,
    issue_permit,
    list_documents,
    publish_upload,
    read_document,
)
from app.files.storage import PrivateStorage
from app.files.validation import validate_file
from app.identity.router import facade_authority, session_proof
from app.identity.security import TOKEN_PATTERN, IdentityError
from app.identity.sessions import identity_for_session
from app.inventory.router import validate_query
from app.settings import Settings

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["files"])
transfers = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])
Proof = Annotated[str, Depends(session_proof)]
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]


def resources(request: Request) -> tuple[Database, Settings]:
    return cast(Database, request.app.state.database), cast(Settings, request.app.state.settings)


def metadata_response(request: Request, result: dict[str, object]) -> dict[str, object]:
    if request.headers.get("X-Kay-Photo-Capabilities") != "1":
        rows = cast(list[dict[str, object]], result["items"]) if "items" in result else [result]
        for row in rows:
            row.pop("can_upload", None)
    return result


@router.post("/documents")
def create_document(
    request: Request, token: Proof, key: RetryKey, body: NewDocument
) -> dict[str, object]:
    validate_query(request, set())
    return metadata_response(request, document_command(resources(request)[0], token, key, body))


@router.get("/documents")
def documents(
    request: Request,
    token: Proof,
    parent_kind: Literal["contact", "development", "property", "deal"],
    parent_id: UUID,
    purpose: Literal["attachment", "photo"] | None = None,
    page: Annotated[int, Query(ge=1, le=100000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, object]:
    validate_query(request, {"parent_kind", "parent_id", "purpose", "page", "page_size"})
    return metadata_response(
        request,
        list_documents(
            resources(request)[0], token, parent_kind, parent_id, page, page_size, purpose
        ),
    )


@router.get("/documents/{did}")
def document(request: Request, token: Proof, did: UUID) -> dict[str, object]:
    validate_query(request, set())
    return metadata_response(request, read_document(resources(request)[0], token, did))


@router.post("/documents/{did}/archive")
def archive_document(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ArchiveDocument
) -> dict[str, object]:
    validate_query(request, set())
    return metadata_response(
        request, document_command(resources(request)[0], token, key, body, did)
    )


@router.post("/files/permits")
def permit(request: Request, token: Proof, body: PermitRequest) -> dict[str, object]:
    validate_query(request, set())
    result = issue_permit(
        resources(request)[0], token, body, request.headers.get("X-CSRF-Token", "")
    )
    result["transfer_url"] = (
        f"{str(request.base_url).rstrip('/')}/api/v1/transfers/{result['permit_id']}"
    )
    return result


@router.post("/documents/{did}/retry-scan")
def retry_document(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ArchiveDocument
) -> dict[str, object]:
    validate_query(request, set())
    return metadata_response(
        request, document_command(resources(request)[0], token, key, body, did, "retry-scan")
    )


def transfer_proof(request: Request) -> str:
    validate_query(request, set())
    _, settings = resources(request)
    raw = request.headers.get("X-File-Permit", "")
    if request.headers.get("Origin") != settings.frontend_origin or not TOKEN_PATTERN.fullmatch(
        raw
    ):
        raise IdentityError("FILE_PERMIT_INVALID", 403)
    return raw


@transfers.put("/{pid}")
async def upload(request: Request, pid: UUID) -> dict[str, str]:
    raw = transfer_proof(request)
    database, settings = resources(request)
    vid, key, filename, mime, size, sid = await run_in_threadpool(
        consume_permit, database, pid, raw, "upload", request.headers.get("X-File-Session", "")
    )
    declared = request.headers.get("Content-Length")
    if declared and (not declared.isdecimal() or int(declared) != size):
        raise IdentityError("FILE_SIZE_MISMATCH", 413)
    if request.headers.get("Content-Type", "").lower() != mime or request.headers.get(
        "Content-Encoding"
    ):
        raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415)
    storage = PrivateStorage(settings)
    temporary = storage.path(key, partial=True)
    try:
        received = 0
        with temporary.open("xb") as handle:
            async with asyncio.timeout(90):
                async for chunk in request.stream():
                    received += len(chunk)
                    if received > size or received > MAX_FILE_BYTES:
                        raise IdentityError("FILE_TOO_LARGE", 413)
                    handle.write(chunk)
            handle.flush()
            os.fsync(handle.fileno())
        if received != size:
            raise IdentityError("FILE_SIZE_MISMATCH", 413)
        data = await run_in_threadpool(temporary.read_bytes)
        await run_in_threadpool(validate_file, data, filename, mime)
        await run_in_threadpool(storage.promote, key)
        await run_in_threadpool(publish_upload, database, vid, sid, hashlib.sha256(data).digest())
        return {"state": "pending_scan", "version_id": str(vid)}
    except OSError, TimeoutError, ClientDisconnect:
        raise IdentityError("FILE_TRANSFER_INTERRUPTED", 503) from None
    finally:
        if temporary.exists():
            temporary.unlink()


@transfers.get("/{pid}")
def download(request: Request, pid: UUID) -> Response:
    raw = transfer_proof(request)
    database, settings = resources(request)
    vid, key, filename, mime, size, sid = consume_permit(
        database, pid, raw, "download", request.headers.get("X-File-Session", "")
    )
    with database.session() as session:
        digest = session.scalar(select(DocumentVersion.sha256).where(DocumentVersion.id == vid))
        version = session.get(DocumentVersion, vid)
        if version is None:
            raise IdentityError("NOT_FOUND", 404)
        did = version.document_id
    data = PrivateStorage(settings).read(key, size, digest)

    def chunks() -> Iterator[bytes]:
        for offset in range(0, len(data), 65536):
            with database.session() as session:
                document = authorized_document(session, identity_for_session(session, sid), did)
                if document.archived_at:
                    return
            yield data[offset : offset + 65536]

    return StreamingResponse(
        chunks(),
        media_type=mime,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename, safe='')}",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Cache-Control": "no-store",
            "Content-Length": str(size),
        },
    )
