"""Catalogue links for either enquiry or deal, sharing current facade authority."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.security import IdentityError
from app.project_links.contracts import LinkQuery, NewLink, RemoveLink
from app.project_links.service import Scope, mutate_link, read_links

router = APIRouter(
    prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["project-links"]
)


@router.get("/enquiries/{target}/project-links")
@router.get("/deals/{target}/project-links")
def list_links(
    request: Request, token: Proof, target: UUID, query: Annotated[LinkQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    scope: Scope = "enquiries" if "/enquiries/" in request.url.path else "deals"
    return read_links(configuration(request)[0], token, scope, target, query)


@router.post("/enquiries/{target}/project-links")
@router.post("/deals/{target}/project-links")
def add_link(
    request: Request, token: Proof, key: RetryKey, target: UUID, body: NewLink
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    scope: Scope = "enquiries" if "/enquiries/" in request.url.path else "deals"
    database, secret = configuration(request)
    return mutate_link(database, token, secret, key, scope, target, body)


@router.delete("/enquiries/{target}/project-links/{link_id}")
@router.delete("/deals/{target}/project-links/{link_id}")
def remove_link(
    request: Request,
    token: Proof,
    key: RetryKey,
    target: UUID,
    link_id: UUID,
    body: RemoveLink,
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    scope: Scope = "enquiries" if "/enquiries/" in request.url.path else "deals"
    database, secret = configuration(request)
    return mutate_link(database, token, secret, key, scope, target, None, link_id)
