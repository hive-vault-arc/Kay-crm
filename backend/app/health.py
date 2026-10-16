"""Safe liveness and facade-only PostgreSQL readiness endpoints."""

import secrets
from typing import cast

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import Database
from app.errors import error_response
from app.settings import Settings

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("/live")
def live() -> dict[str, str]:
    """Liveness is independent of PostgreSQL and discloses no infrastructure detail."""
    return {"status": "live"}


@router.get("/ready")
def ready(request: Request) -> JSONResponse:
    """Readiness is a real DB round trip, never a cached startup flag."""
    settings = cast(Settings, request.app.state.settings)
    supplied = request.headers.get("X-Kay-Facade-Secret", "")
    if not secrets.compare_digest(
        supplied.encode(), settings.facade_secret.get_secret_value().encode()
    ):
        return error_response(403, "FORBIDDEN", request.state.request_id)
    database = cast(Database, request.app.state.database)
    try:
        with database.session() as session:
            session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return error_response(503, "DEPENDENCY_UNAVAILABLE", request.state.request_id)
    return JSONResponse({"status": "ready"})
