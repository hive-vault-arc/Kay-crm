"""Explicit requirement routes behind current staff facade and CSRF authority."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.security import IdentityError
from app.requirements.commands import Body, command
from app.requirements.contracts import (
    EditRequirement,
    NewRequirement,
    RemoveShortlist,
    RequirementQuery,
    ShortlistChange,
)
from app.requirements.queries import read_detail, read_list

router = APIRouter(
    prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["requirements"]
)


def mutate(
    request: Request,
    token: str,
    key: UUID,
    body: Body,
    rid: UUID | None = None,
    oid: UUID | None = None,
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, rid, oid)


@router.get("/requirements")
def requirements(
    request: Request, token: Proof, query: Annotated[RequirementQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_list(configuration(request)[0], token, query)


@router.post("/requirements")
def create(
    request: Request, token: Proof, key: RetryKey, body: NewRequirement
) -> dict[str, object]:
    return mutate(request, token, key, body)


@router.get("/requirements/{rid}")
def requirement(request: Request, token: Proof, rid: UUID) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return read_detail(configuration(request)[0], token, rid)


@router.patch("/requirements/{rid}")
def edit(
    request: Request, token: Proof, key: RetryKey, rid: UUID, body: EditRequirement
) -> dict[str, object]:
    return mutate(request, token, key, body, rid)


@router.post("/requirements/{rid}/shortlist")
def add(
    request: Request, token: Proof, key: RetryKey, rid: UUID, body: ShortlistChange
) -> dict[str, object]:
    return mutate(request, token, key, body, rid)


@router.delete("/requirements/{rid}/shortlist/{oid}")
def remove(
    request: Request, token: Proof, key: RetryKey, rid: UUID, oid: UUID, body: RemoveShortlist
) -> dict[str, object]:
    return mutate(request, token, key, body, rid, oid)
