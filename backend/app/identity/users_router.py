"""Administrator staff HTTP boundary; authority is checked again inside each transaction."""

from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request

from app.db.session import Database
from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.identity.user_contracts import EditUser, NewUser, ResetUser, Versioned
from app.identity.users import command, read_user, read_users
from app.settings import Settings

router = APIRouter(prefix="/api/v1/users", dependencies=[Depends(facade_authority)], tags=["users"])
Proof = Annotated[str, Depends(session_proof)]
Key = Annotated[UUID, Header(alias="Idempotency-Key")]


@router.get("")
def listing(
    request: Request,
    token: Proof,
    page: Annotated[int, Query(ge=1, le=1000000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
) -> dict[str, object]:
    if (
        any(key not in {"page", "page_size", "sort"} for key in request.query_params)
        or len(request.query_params) != len(request.query_params.multi_items())
        or request.query_params.get("sort", "-updated_at") != "-updated_at"
    ):
        raise IdentityError("VALIDATION_ERROR", 422)
    return read_users(cast(Database, request.app.state.database), token, page, page_size)


@router.get("/{target}")
def detail(target: UUID, request: Request, token: Proof) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return read_user(cast(Database, request.app.state.database), token, target)


def execute(
    request: Request,
    token: str,
    key: UUID,
    operation: str,
    body: NewUser | EditUser | ResetUser | Versioned,
    target: UUID | None = None,
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    return command(
        cast(Database, request.app.state.database),
        token,
        cast(Settings, request.app.state.settings).facade_secret.get_secret_value(),
        key,
        operation,
        body,
        target,
    )


@router.post("")
def create(body: NewUser, request: Request, token: Proof, key: Key) -> dict[str, object]:
    return execute(request, token, key, "create", body)


@router.patch("/{target}")
def edit(
    target: UUID, body: EditUser, request: Request, token: Proof, key: Key
) -> dict[str, object]:
    return execute(request, token, key, "edit", body, target)


@router.delete("/{target}")
def delete_user(
    target: UUID, body: Versioned, request: Request, token: Proof, key: Key
) -> dict[str, object]:
    return execute(request, token, key, "delete", body, target)


@router.post("/{target}/reset-password")
def reset(
    target: UUID, body: ResetUser, request: Request, token: Proof, key: Key
) -> dict[str, object]:
    return execute(request, token, key, "reset-password", body, target)
