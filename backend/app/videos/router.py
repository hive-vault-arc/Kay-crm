"""Allowlisted staff commands and direct binary transfers for inventory video."""

import asyncio
import re
from collections.abc import Iterator
from time import monotonic
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from app.db.session import Database
from app.files.router import Proof, resources, transfer_proof
from app.identity.router import facade_authority
from app.identity.security import TOKEN_PATTERN, IdentityError
from app.inventory.router import validate_query
from app.videos import service
from app.videos.storage import VideoStorage

router = APIRouter(prefix="/api/v1/inventory-videos", dependencies=[Depends(facade_authority)])
transfers = APIRouter(prefix="/api/v1/video-transfers")
upload_slots = asyncio.Semaphore(8)


def check_enabled(request: Request) -> None:
    if not service.enabled(resources(request)[1]):
        raise IdentityError("NOT_FOUND", 404)


@router.get("")
def listing(
    request: Request, token: Proof, parent_kind: service.ParentKind, parent_id: UUID
) -> dict[str, object]:
    validate_query(request, {"parent_kind", "parent_id"})
    database, settings = resources(request)
    if not service.enabled(settings):
        return {"enabled": False, "items": []}
    return service.listing(database, token, parent_kind, parent_id)


@router.post("")
def reserve(request: Request, token: Proof, body: service.NewVideo) -> dict[str, object]:
    validate_query(request, set())
    check_enabled(request)
    return service.reserve(resources(request)[0], token, body)


@router.post("/{vid}/archive")
def archive(request: Request, token: Proof, vid: UUID) -> dict[str, bool]:
    validate_query(request, set())
    check_enabled(request)
    return service.archive(resources(request)[0], token, vid)


@router.post("/{vid}/playback")
def grant(request: Request, token: Proof, vid: UUID) -> dict[str, str]:
    validate_query(request, set())
    check_enabled(request)
    return service.grant_playback(resources(request)[0], token, vid)


def expected_part(database: Database, vid: UUID, token: str, number: int) -> int:
    with database.session() as session:
        video = service.permitted_part(session, vid, token, number, lock=False)
        return service.part_size(video.input_size, number)


@transfers.put("/{vid}/parts/{number}")
async def upload(request: Request, vid: UUID, number: int) -> dict[str, int]:
    check_enabled(request)
    permit = transfer_proof(request)
    database, settings = resources(request)
    if request.headers.get("Content-Type") != "application/octet-stream" or request.headers.get(
        "Content-Encoding"
    ):
        raise IdentityError("UNSUPPORTED_MEDIA_TYPE", 415)
    if upload_slots.locked():
        raise IdentityError("RATE_LIMITED", 429)
    async with upload_slots:
        size = await run_in_threadpool(expected_part, database, vid, permit, number)
        if request.headers.get("Content-Length") not in {None, str(size)}:
            raise IdentityError("FILE_SIZE_MISMATCH", 413)
        buffer = bytearray()
        try:
            async with asyncio.timeout(90):
                async for chunk in request.stream():
                    if len(buffer) + len(chunk) > size:
                        raise IdentityError("FILE_SIZE_MISMATCH", 413)
                    buffer.extend(chunk)
        except TimeoutError, ClientDisconnect:
            raise IdentityError("FILE_TRANSFER_INTERRUPTED", 503) from None
        return await run_in_threadpool(
            service.accept_part, database, settings, vid, permit, number, bytes(buffer)
        )


def byte_range(header: str | None, size: int) -> tuple[int, int] | None:
    if header is None:
        return 0, size - 1
    match = re.fullmatch(r"bytes=([0-9]{0,15})-([0-9]{0,15})", header)
    if not match:
        return None
    first, last = match.groups()
    if not first:
        if not last or int(last) == 0:
            return None
        return max(0, size - int(last)), size - 1
    start, end = int(first), min(int(last), size - 1) if last else size - 1
    return (start, end) if start <= end else None


@transfers.api_route("/{vid}/play", methods=["GET", "HEAD"])
def play(request: Request, vid: UUID, grant: str) -> Response:
    check_enabled(request)
    validate_query(request, {"grant"})
    database, settings = resources(request)
    if request.headers.get("Origin") != settings.frontend_origin or not TOKEN_PATTERN.fullmatch(
        grant
    ):
        raise IdentityError("FILE_PERMIT_INVALID", 403)
    key, size = service.playback(database, vid, grant)
    incoming = request.headers.get("Range")
    requested = byte_range(incoming, size)
    headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    }
    if requested is None:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
    start, end = requested
    length = end - start + 1
    headers["Content-Length"] = str(length)
    status = 206 if incoming else 200
    if incoming:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    if request.method == "HEAD":
        return Response(status_code=status, headers=headers, media_type="video/mp4")

    def chunks() -> Iterator[bytes]:
        remaining = length
        verified_at = monotonic()
        with VideoStorage(settings).open_range(key, start, end) as stream:
            while remaining:
                if monotonic() - verified_at >= 5:
                    try:
                        service.playback(database, vid, grant)
                    except IdentityError:
                        return
                    verified_at = monotonic()
                data = stream.read(min(65536, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(chunks(), status_code=status, headers=headers, media_type="video/mp4")
