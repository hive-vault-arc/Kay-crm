"""Explicit lifecycle/history endpoints; CSRF/session proof is shared with identity."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.history import read_history
from app.contacts.ownership import mutate, preview
from app.contacts.ownership_contracts import (
    ChangeIntent,
    ConfirmedChange,
    EnquiryAssignment,
    NewNote,
)
from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.security import IdentityError

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["ownership"])


@router.post("/contacts/{target}/preview")
def contact_preview(
    target: UUID, body: ChangeIntent, request: Request, token: Proof
) -> dict[str, object]:
    database, secret = configuration(request)
    return preview(database, token, secret, target, body)


@router.post("/contacts/{target}/assign")
@router.put("/contacts/{target}/collaborators")
@router.post("/contacts/{target}/archive")
@router.post("/contacts/{target}/restore")
@router.post("/contacts/{target}/merge")
def change_contact(
    target: UUID, body: ConfirmedChange, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return mutate(database, token, secret, key, target, body, request.url.path.rsplit("/", 1)[1])


@router.post("/contacts/{target}/notes")
def add_note(
    target: UUID, body: NewNote, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return mutate(database, token, secret, key, target, body, "notes")


@router.post("/enquiries/{target}/assign")
def assign_enquiry(
    target: UUID, body: EnquiryAssignment, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return mutate(database, token, secret, key, target, body, "enquiry-assign")


@router.get("/contacts/{target}/timeline")
@router.get("/contacts/{target}/assignment-events")
def history(
    target: UUID,
    request: Request,
    token: Proof,
    page: Annotated[int, Query(ge=1, le=1000000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, object]:
    validate_query(request)
    if set(request.query_params) - {"page", "page_size"}:
        raise IdentityError("VALIDATION_ERROR", 422)
    return read_history(
        configuration(request)[0],
        token,
        target,
        request.url.path.rsplit("/", 1)[1],
        page,
        page_size,
    )
