import asyncio
import os
from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from app.contacts.contracts import StrictBody
from app.db.session import Database
from app.files.router import transfer_proof
from app.files.storage import PrivateStorage
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.imports.contracts import MAX_BYTES, Approve, NewBatch, Preview
from app.imports.queries import read_batch
from app.imports.service import approve, create_batch, preview
from app.imports.uploads import consume_upload, issue_upload, publish_upload
from app.inventory.router import validate_query
from app.settings import Settings

router = APIRouter(
    prefix="/api/v1/imports", dependencies=[Depends(facade_authority)], tags=["imports"]
)
transfers = APIRouter(prefix="/api/v1/transfers/imports", tags=["import-transfers"])
Proof = Annotated[str, Depends(session_proof)]
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]


def resources(request: Request) -> tuple[Database, Settings]:
    return cast(Database, request.app.state.database), cast(Settings, request.app.state.settings)


@router.post("")
def create(request: Request, token: Proof, key: RetryKey, body: NewBatch) -> dict[str, object]:
    validate_query(request, set())
    return create_batch(resources(request)[0], token, key, body)


@router.get("/{bid}")
def read(
    request: Request,
    token: Proof,
    bid: UUID,
    page: Annotated[int, Query(ge=1, le=1000000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, object]:
    validate_query(request, {"page", "page_size"})
    return read_batch(resources(request)[0], token, bid, page, page_size)


@router.post("/{bid}/upload-permit")
def permit(request: Request, token: Proof, bid: UUID, body: StrictBody) -> dict[str, str]:
    validate_query(request, set())
    result = issue_upload(
        resources(request)[0], token, bid, request.headers.get("X-CSRF-Token", "")
    )
    return result | {
        "transfer_url": f"{str(request.base_url).rstrip('/')}/api/v1/transfers/imports/{bid}"
    }


@router.post("/{bid}/preview")
def make_preview(request: Request, token: Proof, bid: UUID, body: Preview) -> dict[str, object]:
    validate_query(request, set())
    return preview(*resources(request), token, bid, body)


@router.post("/{bid}/approve")
def commit(
    request: Request, token: Proof, bid: UUID, key: RetryKey, body: Approve
) -> dict[str, object]:
    validate_query(request, set())
    return approve(resources(request)[0], token, bid, key, body)


@transfers.put("/{bid}")
async def upload(request: Request, bid: UUID) -> dict[str, str]:
    raw = transfer_proof(request)
    database, settings = resources(request)
    key, size, sid = await run_in_threadpool(
        consume_upload, database, bid, raw, request.headers.get("X-File-Session", "")
    )
    if request.headers.get("Content-Type", "").lower() != "text/csv" or request.headers.get(
        "Content-Encoding"
    ):
        raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415)
    declared = request.headers.get("Content-Length")
    if declared and (not declared.isdecimal() or int(declared) != size):
        raise IdentityError("FILE_SIZE_MISMATCH", 413)
    storage = PrivateStorage(settings)
    temporary = storage.path(key, partial=True)
    try:
        received = 0
        with temporary.open("xb") as handle:
            async with asyncio.timeout(90):
                async for chunk in request.stream():
                    received += len(chunk)
                    if received > size or received > MAX_BYTES:
                        raise IdentityError("IMPORT_FILE_TOO_LARGE", 413)
                    handle.write(chunk)
            handle.flush()
            os.fsync(handle.fileno())
        if received != size:
            raise IdentityError("FILE_SIZE_MISMATCH", 413)
        data = await run_in_threadpool(temporary.read_bytes)
        await run_in_threadpool(storage.promote, key)
        await run_in_threadpool(publish_upload, database, bid, key, sid, data)
        return {"state": "uploaded", "batch_id": str(bid)}
    except OSError, TimeoutError, ClientDisconnect:
        raise IdentityError("FILE_TRANSFER_INTERRUPTED", 503) from None
    finally:
        if temporary.exists():
            temporary.unlink()
