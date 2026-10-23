"""Allowlisted staff contact and enquiry operations; no generic record proxy."""

from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request

from app.archive.records import RecordLifecycle
from app.archive.records import command as record_lifecycle
from app.contacts.commands import command
from app.contacts.contracts import (
    EditContact,
    EditEnquiry,
    ListQuery,
    NewContact,
    NewEnquiry,
    ResolvePhone,
)
from app.contacts.owner_portfolio import OwnerPortfolioQuery, read_owner_portfolio
from app.contacts.queries import assignment_options, metadata, read_detail, read_list, resolve_phone
from app.db.session import Database
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.settings import Settings

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["contacts"])
Proof = Annotated[str, Depends(session_proof)]
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]


def configuration(request: Request) -> tuple[Database, str]:
    return cast(Database, request.app.state.database), cast(
        Settings, request.app.state.settings
    ).facade_secret.get_secret_value()


def validate_query(request: Request) -> None:
    params = list(request.query_params.multi_items())
    if len({key for key, _ in params}) != len(params):
        raise IdentityError("VALIDATION_ERROR", 422)


@router.get("/contacts/assignment-options")
def agents(
    request: Request, token: Proof, query: Annotated[ListQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    if set(request.query_params) - {"q", "page", "page_size"}:
        raise IdentityError("VALIDATION_ERROR", 422)
    return assignment_options(configuration(request)[0], token, query)


@router.post("/contacts/resolve-phone")
def resolve(body: ResolvePhone, request: Request, token: Proof) -> dict[str, bool]:
    return resolve_phone(configuration(request)[0], token, body.phone)


@router.get("/contacts/metadata")
def qualification_options(request: Request, token: Proof) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return metadata(configuration(request)[0], token)


@router.get("/contacts")
def contacts(
    request: Request, token: Proof, query: Annotated[ListQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_list(configuration(request)[0], token, "contacts", query)


@router.get("/enquiries")
def enquiries(
    request: Request, token: Proof, query: Annotated[ListQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_list(configuration(request)[0], token, "enquiries", query)


@router.get("/contacts/{target}")
def contact(target: UUID, request: Request, token: Proof) -> dict[str, object]:
    return read_detail(configuration(request)[0], token, "contacts", target)


@router.get("/contacts/{target}/portfolio")
def owner_portfolio(
    target: UUID, request: Request, token: Proof, query: Annotated[OwnerPortfolioQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_owner_portfolio(configuration(request)[0], token, target, query)


@router.get("/enquiries/{target}")
def enquiry(target: UUID, request: Request, token: Proof) -> dict[str, object]:
    return read_detail(configuration(request)[0], token, "enquiries", target)


@router.post("/contacts")
def add_contact(
    body: NewContact, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return command(database, token, secret, key, "contacts", body)


@router.post("/enquiries")
def add_enquiry(
    body: NewEnquiry, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return command(database, token, secret, key, "enquiries", body)


@router.patch("/contacts/{target}")
def edit_contact(
    target: UUID, body: EditContact, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return command(database, token, secret, key, "contacts", body, target)


@router.patch("/enquiries/{target}")
def edit_enquiry(
    target: UUID, body: EditEnquiry, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    database, secret = configuration(request)
    return command(database, token, secret, key, "enquiries", body, target)


@router.post("/enquiries/{target}/archive")
def archive_enquiry(
    target: UUID, body: RecordLifecycle, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    database, secret = configuration(request)
    return record_lifecycle(database, token, secret, key, "enquiries", target, "archive", body)


@router.post("/enquiries/{target}/restore")
def restore_enquiry(
    target: UUID, body: RecordLifecycle, request: Request, token: Proof, key: RetryKey
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    database, secret = configuration(request)
    return record_lifecycle(database, token, secret, key, "enquiries", target, "restore", body)
