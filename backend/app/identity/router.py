"""The four allowlisted staff auth operations; bootstrap has no HTTP endpoint."""

import secrets
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, SecretStr

from app.db.session import Database
from app.identity.security import IdentityError, csrf_token
from app.identity.service import change_password, login, logout
from app.identity.sessions import current_identity
from app.settings import Settings


class LoginBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=1, max_length=254)
    password: SecretStr = Field(min_length=1, max_length=1024)


class ChangePasswordBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    old_password: SecretStr = Field(min_length=1, max_length=1024)
    new_password: SecretStr = Field(min_length=12, max_length=1024)


def facade_authority(request: Request) -> None:
    settings = cast(Settings, request.app.state.settings)
    supplied = request.headers.get("X-Kay-Facade-Secret", "")
    if not secrets.compare_digest(
        supplied.encode(), settings.facade_secret.get_secret_value().encode()
    ):
        raise IdentityError("FORBIDDEN", 403)
    if request.method != "GET" and request.headers.get("Origin") != settings.frontend_origin:
        raise IdentityError("FORBIDDEN", 403)


router = APIRouter(
    prefix="/api/v1/auth", dependencies=[Depends(facade_authority)], tags=["identity"]
)


def session_proof(request: Request) -> str:
    token = request.headers.get("X-Kay-Session", "")
    database = cast(Database, request.app.state.database)
    with database.session() as session:
        current_identity(session, token, restricted_allowed=True)
    if request.method != "GET":
        settings = cast(Settings, request.app.state.settings)
        expected = csrf_token(settings.facade_secret.get_secret_value(), token)
        if not secrets.compare_digest(
            request.headers.get("X-CSRF-Token", "").encode(), expected.encode()
        ):
            raise IdentityError("FORBIDDEN", 403)
    return token


@router.post("/login")
def sign_in(body: LoginBody, request: Request) -> dict[str, str]:
    database = cast(Database, request.app.state.database)
    settings = cast(Settings, request.app.state.settings)
    token, expires = login(
        database,
        settings.facade_secret.get_secret_value(),
        body.email,
        body.password.get_secret_value(),
    )
    return {"session_token": token, "expires_at": expires.isoformat()}


@router.get("/me")
def me(request: Request, token: Annotated[str, Depends(session_proof)]) -> dict[str, object]:
    database = cast(Database, request.app.state.database)
    settings = cast(Settings, request.app.state.settings)
    with database.session() as session:
        identity = current_identity(session, token, restricted_allowed=True)
        return {
            "user": {
                "id": str(identity.user.id),
                "display_name": identity.user.display_name,
                "email": identity.user.email,
                "role": identity.user.role,
            },
            "must_change_password": identity.credential.must_change_password,
            "expires_at": identity.session.expires_at.isoformat(),
            "csrf_token": csrf_token(settings.facade_secret.get_secret_value(), token),
        }


@router.post("/logout")
def sign_out(request: Request, token: Annotated[str, Depends(session_proof)]) -> dict[str, bool]:
    logout(cast(Database, request.app.state.database), token)
    return {"signed_out": True}


@router.post("/change-password")
def own_password(
    body: ChangePasswordBody, request: Request, token: Annotated[str, Depends(session_proof)]
) -> dict[str, bool]:
    change_password(
        cast(Database, request.app.state.database),
        token,
        body.old_password.get_secret_value(),
        body.new_password.get_secret_value(),
    )
    return {"fresh_login_required": True}
