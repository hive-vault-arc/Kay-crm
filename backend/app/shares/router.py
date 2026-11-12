"""Staff management and a deliberately separate, no-login client API."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, Response

from app.files.router import Proof, RetryKey, resources
from app.files.service import locked_identity
from app.identity.router import facade_authority
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.inventory.router import validate_query
from app.settings import Settings
from app.shares import public as client
from app.shares import service
from app.shares.contracts import ApproveListing, ExpectedVersion, TargetKind

staff = APIRouter(prefix="/api/v1/listing-shares", dependencies=[Depends(facade_authority)])
public = APIRouter(prefix="/api/v1/client-listing")
Capability = Annotated[str | None, Header(alias="X-Kay-Listing-Link")]
PUBLIC_HEADERS = {
    "X-Robots-Tag": "noindex, nofollow, noimageindex",
    "Referrer-Policy": "no-referrer",
}


def enabled(settings: Settings) -> None:
    if not settings.inventory_shares_enabled:
        raise IdentityError("NOT_FOUND", 404)


def anonymous(request: Request, settings: Settings) -> None:
    enabled(settings)
    validate_query(request, set())
    if request.headers.get("Origin") != settings.frontend_origin:
        raise IdentityError("NOT_FOUND", 404)


@staff.get("/{kind}/{identifier}")
def get_status(
    request: Request, token: Proof, kind: TargetKind, identifier: UUID
) -> dict[str, object]:
    database, settings = resources(request)
    validate_query(request, set())
    with database.session() as session:
        identity = current_identity(session, token)
        if not settings.inventory_shares_enabled:
            return {"enabled": False}
        return service.status(session, identity, kind, identifier)


@staff.post("/{kind}/{identifier}/approve")
def approve(
    request: Request, token: Proof, kind: TargetKind, identifier: UUID, body: ApproveListing
) -> dict[str, bool]:
    database, settings = resources(request)
    enabled(settings)
    validate_query(request, set())
    with database.session() as session, session.begin():
        service.approve(session, locked_identity(session, token), kind, identifier, body)
    return {"saved": True}


@staff.post("/{kind}/{identifier}/withdraw")
def withdraw(
    request: Request, token: Proof, kind: TargetKind, identifier: UUID, body: ExpectedVersion
) -> dict[str, bool]:
    database, settings = resources(request)
    enabled(settings)
    validate_query(request, set())
    with database.session() as session, session.begin():
        service.withdraw(
            session, locked_identity(session, token), kind, identifier, body.expected_version
        )
    return {"saved": True}


@staff.post("/{kind}/{identifier}/links")
def issue(
    request: Request,
    token: Proof,
    kind: TargetKind,
    identifier: UUID,
    body: ExpectedVersion,
    key: RetryKey,
) -> dict[str, str]:
    database, settings = resources(request)
    enabled(settings)
    validate_query(request, set())
    with database.session() as session, session.begin():
        return service.issue(
            session,
            locked_identity(session, token),
            kind,
            identifier,
            body.expected_version,
            key,
            settings.facade_secret.get_secret_value(),
        )


@staff.post("/{kind}/{identifier}/links/{link_id}/revoke")
def revoke(
    request: Request, token: Proof, kind: TargetKind, identifier: UUID, link_id: UUID
) -> dict[str, bool]:
    database, settings = resources(request)
    enabled(settings)
    validate_query(request, set())
    with database.session() as session, session.begin():
        service.revoke(session, locked_identity(session, token), kind, identifier, link_id)
    return {"saved": True}


@public.get("")
def read_listing(
    request: Request, response: Response, token: Capability = None
) -> dict[str, object]:
    database, settings = resources(request)
    anonymous(request, settings)
    response.headers.update(PUBLIC_HEADERS)
    with database.session() as session:
        return client.read_listing(session, settings, token or "")


@public.get("/photos/{position}")
def read_photo(request: Request, position: int, token: Capability = None) -> Response:
    database, settings = resources(request)
    anonymous(request, settings)
    if not client.image_slots.acquire(blocking=False):
        raise IdentityError("RATE_LIMITED", 429)
    try:
        with database.session() as session:
            data = client.read_photo(session, settings, token or "", position)
        return Response(data, media_type="image/webp", headers=PUBLIC_HEADERS)
    finally:
        client.image_slots.release()
