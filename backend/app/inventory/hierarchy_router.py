"""Explicit development/level routes; no generic inventory write relay."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.identity.router import facade_authority
from app.inventory.contracts import ConfirmAvailability, InventoryQuery, Owners
from app.inventory.hierarchy_contracts import (
    ArchiveDevelopment,
    DevelopmentFields,
    EditDevelopment,
    StructureFields,
    TypeFields,
)
from app.inventory.hierarchy_queries import read_hierarchy
from app.inventory.outcome_contracts import ExternalOutcome
from app.inventory.outcome_queries import stock_review
from app.inventory.router import Proof, RetryKey, database, mutate, validate_query

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["inventory"])
PageQuery = Annotated[InventoryQuery, Query()]
PAGE = {"page", "page_size"}


@router.get("/developments")
def developments(request: Request, token: Proof, query: PageQuery) -> dict[str, object]:
    validate_query(request, PAGE | {"q", "category", "offering_kind", "state", "sort", "archive"})
    return read_hierarchy(database(request), token, "developments", None, query)


@router.post("/developments")
def create_development(
    request: Request, token: Proof, key: RetryKey, body: DevelopmentFields
) -> dict[str, object]:
    return mutate(request, token, key, "create-development", body)


@router.get("/developments/{did}")
def detail(request: Request, token: Proof, did: UUID) -> dict[str, object]:
    validate_query(request, set())
    return read_hierarchy(database(request), token, "detail", did, InventoryQuery())


@router.patch("/developments/{did}")
def edit(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: EditDevelopment
) -> dict[str, object]:
    return mutate(request, token, key, "development-edit", body, did)


@router.get("/developments/{did}/inventory")
def inventory(request: Request, token: Proof, did: UUID, query: PageQuery) -> dict[str, object]:
    validate_query(
        request,
        PAGE
        | {
            "q",
            "category",
            "block_id",
            "floor_id",
            "unit_type_id",
            "offering_kind",
            "state",
            "archive",
        },
    )
    if "state" not in request.query_params:
        query.state = "available"
    return read_hierarchy(database(request), token, "inventory", did, query)


@router.get("/developments/{did}/stock-review")
def outcome_review(
    request: Request, token: Proof, did: UUID, offering_id: UUID
) -> dict[str, object]:
    validate_query(request, {"offering_id"})
    return stock_review(database(request), token, did, offering_id, development=True)


@router.post("/developments/{did}/external-outcome")
def external_outcome(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ExternalOutcome
) -> dict[str, object]:
    return mutate(request, token, key, "development-external-outcome", body, did)


@router.get("/developments/{did}/blocks")
def blocks(request: Request, token: Proof, did: UUID, query: PageQuery) -> dict[str, object]:
    validate_query(request, PAGE)
    return read_hierarchy(database(request), token, "blocks", did, query)


@router.post("/developments/{did}/blocks")
def create_block(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: StructureFields
) -> dict[str, object]:
    return mutate(request, token, key, "create-block", body, did)


@router.patch("/blocks/{bid}")
def edit_block(
    request: Request, token: Proof, key: RetryKey, bid: UUID, body: StructureFields
) -> dict[str, object]:
    return mutate(request, token, key, "edit-block", body, bid)


@router.get("/blocks/{bid}/floors")
def floors(request: Request, token: Proof, bid: UUID, query: PageQuery) -> dict[str, object]:
    validate_query(request, PAGE)
    return read_hierarchy(database(request), token, "floors", bid, query)


@router.post("/blocks/{bid}/floors")
def create_floor(
    request: Request, token: Proof, key: RetryKey, bid: UUID, body: StructureFields
) -> dict[str, object]:
    return mutate(request, token, key, "create-floor", body, bid)


@router.patch("/floors/{fid}")
def edit_floor(
    request: Request, token: Proof, key: RetryKey, fid: UUID, body: StructureFields
) -> dict[str, object]:
    return mutate(request, token, key, "edit-floor", body, fid)


@router.get("/developments/{did}/unit-types")
def types(request: Request, token: Proof, did: UUID, query: PageQuery) -> dict[str, object]:
    validate_query(request, PAGE)
    return read_hierarchy(database(request), token, "unit-types", did, query)


@router.post("/developments/{did}/unit-types")
def create_type(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: TypeFields
) -> dict[str, object]:
    return mutate(request, token, key, "create-type", body, did)


@router.patch("/unit-types/{tid}")
def edit_type(
    request: Request, token: Proof, key: RetryKey, tid: UUID, body: TypeFields
) -> dict[str, object]:
    return mutate(request, token, key, "edit-type", body, tid)


@router.get("/developments/{did}/owners")
def owners(request: Request, token: Proof, did: UUID) -> dict[str, object]:
    validate_query(request, set())
    return read_hierarchy(database(request), token, "owners", did, InventoryQuery())


@router.put("/developments/{did}/owners")
def set_owners(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: Owners
) -> dict[str, object]:
    return mutate(request, token, key, "development-owners", body, did)


@router.post("/developments/{did}/confirm-availability")
def confirm(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ConfirmAvailability
) -> dict[str, object]:
    return mutate(request, token, key, "development-confirm", body, did)


@router.get("/developments/{did}/history")
def history(request: Request, token: Proof, did: UUID, query: PageQuery) -> dict[str, object]:
    validate_query(request, PAGE)
    return read_hierarchy(database(request), token, "history", did, query)


@router.post("/developments/{did}/archive")
def archive(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ArchiveDevelopment
) -> dict[str, object]:
    return mutate(request, token, key, "development-archive", body, did)


@router.post("/developments/{did}/restore")
def restore(
    request: Request, token: Proof, key: RetryKey, did: UUID, body: ArchiveDevelopment
) -> dict[str, object]:
    return mutate(request, token, key, "development-restore", body, did)
