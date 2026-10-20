"""Authenticated, scoped draft catalogue, generation and immutable history."""

from typing import Annotated, Literal, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request

from app.db.session import Database
from app.generated.contracts import GenerateRequest
from app.generated.service import context, generate, history
from app.identity.router import facade_authority, session_proof
from app.inventory.router import validate_query
from app.settings import Settings

router = APIRouter(
    prefix="/api/v1/generated-documents",
    dependencies=[Depends(facade_authority)],
    tags=["generated-documents"],
)
Proof = Annotated[str, Depends(session_proof)]
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]
Parent = Literal["enquiry", "deal"]


def resources(request: Request) -> tuple[Database, Settings]:
    return cast(Database, request.app.state.database), cast(Settings, request.app.state.settings)


@router.get("/context")
def read_context(
    request: Request, token: Proof, parent_kind: Parent, parent_id: UUID
) -> dict[str, object]:
    validate_query(request, {"parent_kind", "parent_id"})
    return context(resources(request)[0], token, parent_kind, parent_id)


@router.get("")
def read_history(
    request: Request,
    token: Proof,
    parent_kind: Parent,
    parent_id: UUID,
    page: Annotated[int, Query(ge=1, le=1000000)] = 1,
) -> dict[str, object]:
    validate_query(request, {"parent_kind", "parent_id", "page"})
    return history(resources(request)[0], token, parent_kind, parent_id, page)


@router.post("")
def create(
    request: Request, token: Proof, key: RetryKey, body: GenerateRequest
) -> dict[str, object]:
    validate_query(request, set())
    database, settings = resources(request)
    return generate(database, settings, token, key, body)
