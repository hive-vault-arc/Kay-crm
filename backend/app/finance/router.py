"""Dedicated finance routes never add privileged fields to ordinary deal responses."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.finance.commands import command
from app.finance.contracts import Correction, FinanceQuery, NewCommission, NewReceipt, Recognize
from app.finance.queries import read
from app.identity.router import facade_authority
from app.schedule.router import no_query

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["finance"])


@router.get("/deals/{did}/commissions")
def commissions(
    request: Request, token: Proof, did: UUID, query: Annotated[FinanceQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read(configuration(request)[0], token, did, query)


@router.post("/deals/{did}/commissions")
def create(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: NewCommission
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, did=did)


@router.get("/commissions/{cid}")
def detail(request: Request, token: Proof, cid: UUID) -> dict[str, object]:
    no_query(request)
    return read(configuration(request)[0], token, cid, FinanceQuery(), "detail")


@router.get("/commissions/{cid}/revisions")
def revisions(
    request: Request, token: Proof, cid: UUID, query: Annotated[FinanceQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read(configuration(request)[0], token, cid, query, "revisions")


@router.get("/commissions/{cid}/receipts")
def receipts(
    request: Request, token: Proof, cid: UUID, query: Annotated[FinanceQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read(configuration(request)[0], token, cid, query, "receipts")


@router.post("/commissions/{cid}/recognize")
def recognize(
    request: Request, token: Proof, key: RetryKey, cid: UUID, body: Recognize
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, cid=cid)


@router.post("/commissions/{cid}/receipts")
def collect(
    request: Request, token: Proof, key: RetryKey, cid: UUID, body: NewReceipt
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, cid=cid)


@router.post("/commissions/{cid}/correct")
def correct(
    request: Request, token: Proof, key: RetryKey, cid: UUID, body: Correction
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, cid=cid)
