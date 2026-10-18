"""Explicit staff JSON routes; no generic transition to reservation or outcomes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.deals.commands import Body, command
from app.deals.contracts import (
    ChildQuery,
    CloseDeal,
    ConvertLead,
    DealQuery,
    EditCustomerOffer,
    EditDeal,
    NewCustomerOffer,
    NewDeal,
    ReleaseReservation,
    ReopenDeal,
    Reserve,
    Transition,
)
from app.deals.outcome_queries import outcomes as read_outcomes
from app.deals.outcome_queries import stock_review
from app.deals.queries import read_children, read_detail, read_list
from app.identity.router import facade_authority
from app.identity.security import IdentityError

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["deals"])


def mutate(
    request: Request,
    token: str,
    key: UUID,
    body: Body,
    did: UUID | None = None,
    oid: UUID | None = None,
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, did, oid)


@router.get("/deals")
def deals(
    request: Request, token: Proof, query: Annotated[DealQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_list(configuration(request)[0], token, query)


@router.post("/deals")
def create(request: Request, token: Proof, key: RetryKey, body: NewDeal) -> dict[str, object]:
    return mutate(request, token, key, body)


@router.post("/enquiries/{eid}/convert")
def convert_lead(
    request: Request, token: Proof, key: RetryKey, eid: UUID, body: ConvertLead
) -> dict[str, object]:
    return mutate(request, token, key, body, eid)


@router.get("/deals/{did}")
def deal(request: Request, token: Proof, did: UUID) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return read_detail(configuration(request)[0], token, did)


@router.patch("/deals/{did}")
def edit(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: EditDeal
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.post("/deals/{did}/transition")
def transition(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: Transition
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.post("/deals/{did}/reserve")
def reserve(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: Reserve
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.post("/deals/{did}/release-reservation")
def release(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ReleaseReservation
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.get("/deals/{did}/customer-offers")
def offers(
    request: Request, token: Proof, did: UUID, query: Annotated[ChildQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_children(configuration(request)[0], token, did, "customer-offers", query)


@router.post("/deals/{did}/close")
def close(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: CloseDeal
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.post("/deals/{did}/reopen")
def reopen(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ReopenDeal
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.get("/deals/{did}/stock-review")
def review(request: Request, token: Proof, did: UUID) -> dict[str, object]:
    validate_query(request)
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return stock_review(configuration(request)[0], token, did)


@router.get("/deals/{did}/outcomes")
def outcomes(
    request: Request, token: Proof, did: UUID, query: Annotated[ChildQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_outcomes(configuration(request)[0], token, did, query)


@router.post("/deals/{did}/customer-offers")
def create_offer(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: NewCustomerOffer
) -> dict[str, object]:
    return mutate(request, token, key, body, did)


@router.patch("/customer-offers/{oid}")
def edit_offer(
    request: Request, token: Proof, key: RetryKey, oid: UUID, body: EditCustomerOffer
) -> dict[str, object]:
    return mutate(request, token, key, body, oid=oid)


@router.get("/deals/{did}/history")
def history(
    request: Request, token: Proof, did: UUID, query: Annotated[ChildQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_children(configuration(request)[0], token, did, "history", query)
