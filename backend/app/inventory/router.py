"""Explicit inventory routes behind the existing staff facade and CSRF proof."""

from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request

from app.db.session import Database
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.inventory.commands import Body, command
from app.inventory.contracts import (
    ConfirmAvailability,
    CreateProperty,
    EditOffering,
    EditProperty,
    InventoryQuery,
    NewOffering,
    Owners,
    PropertiesQuery,
)
from app.inventory.hierarchy_contracts import ArchiveDevelopment
from app.inventory.outcome_contracts import ExternalOutcome
from app.inventory.outcome_queries import stock_review
from app.inventory.queries import read_detail, read_history, read_list
from app.settings import Settings

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["inventory"])
Proof = Annotated[str, Depends(session_proof)]
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]


def database(request: Request) -> Database:
    return cast(Database, request.app.state.database)


def mutate(
    request: Request, token: str, key: UUID, operation: str, body: Body, target: UUID | None = None
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    secret = cast(Settings, request.app.state.settings).facade_secret.get_secret_value()
    return command(database(request), token, secret, key, operation, body, target)


def validate_query(request: Request, allowed: set[str] | None = None) -> None:
    keys = list(request.query_params.keys())
    if len(list(request.query_params.multi_items())) != len(keys) or (
        allowed is not None and set(keys) - allowed
    ):
        raise IdentityError("VALIDATION_ERROR", 422)


@router.get("/properties")
def properties(
    request: Request, token: Proof, query: Annotated[PropertiesQuery, Query()]
) -> dict[str, object]:
    validate_query(
        request,
        {
            "page",
            "page_size",
            "q",
            "category",
            "categories",
            "offering_kind",
            "state",
            "sort",
            "development_id",
            "block_id",
            "floor_id",
            "unit_type_id",
            "target_level",
            "archive",
        },
    )
    return read_list(database(request), token, "properties", query)


@router.post("/properties")
def create_property(
    request: Request, token: Proof, key: RetryKey, body: CreateProperty
) -> dict[str, object]:
    return mutate(request, token, key, "create-property", body)


@router.post("/properties/{pid}/archive")
def archive_property(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: ArchiveDevelopment
) -> dict[str, object]:
    return mutate(request, token, key, "property-archive", body, pid)


@router.post("/properties/{pid}/restore")
def restore_property(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: ArchiveDevelopment
) -> dict[str, object]:
    return mutate(request, token, key, "property-restore", body, pid)


@router.get("/properties/{pid}")
def property_detail(request: Request, token: Proof, pid: UUID) -> dict[str, object]:
    validate_query(request, set())
    return read_detail(database(request), token, pid)


@router.patch("/properties/{pid}")
def edit_property(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: EditProperty
) -> dict[str, object]:
    return mutate(request, token, key, "edit-property", body, pid)


@router.put("/properties/{pid}/owners")
def owners(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: Owners
) -> dict[str, object]:
    return mutate(request, token, key, "owners", body, pid)


@router.post("/properties/{pid}/confirm-availability")
def confirm(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: ConfirmAvailability
) -> dict[str, object]:
    return mutate(request, token, key, "confirm-availability", body, pid)


@router.get("/properties/{pid}/history")
def history(
    request: Request, token: Proof, pid: UUID, query: Annotated[InventoryQuery, Query()]
) -> dict[str, object]:
    validate_query(request, {"page", "page_size"})
    return read_history(database(request), token, pid, query)


@router.get("/properties/{pid}/stock-review")
def outcome_review(
    request: Request, token: Proof, pid: UUID, offering_id: UUID
) -> dict[str, object]:
    validate_query(request, {"offering_id"})
    return stock_review(database(request), token, pid, offering_id, development=False)


@router.post("/properties/{pid}/external-outcome")
def external_outcome(
    request: Request, token: Proof, key: RetryKey, pid: UUID, body: ExternalOutcome
) -> dict[str, object]:
    return mutate(request, token, key, "external-outcome", body, pid)


@router.get("/offerings")
def offerings(
    request: Request, token: Proof, query: Annotated[InventoryQuery, Query()]
) -> dict[str, object]:
    validate_query(
        request,
        {
            "page",
            "page_size",
            "property_id",
            "offering_id",
            "development_id",
            "kind",
            "state",
            "target_level",
            "q",
            "category",
            "block_id",
            "floor_id",
            "unit_type_id",
            "min_comparison_mad",
            "max_comparison_mad",
            "min_area_sqm",
            "min_rooms",
        },
    )
    return read_list(database(request), token, "offerings", query)


@router.post("/offerings")
def create_offering(
    request: Request, token: Proof, key: RetryKey, body: NewOffering
) -> dict[str, object]:
    return mutate(request, token, key, "create-offering", body)


@router.patch("/offerings/{oid}")
def edit_offering(
    request: Request, token: Proof, key: RetryKey, oid: UUID, body: EditOffering
) -> dict[str, object]:
    return mutate(request, token, key, "edit-offering", body, oid)
