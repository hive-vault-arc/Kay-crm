"""HTTP/lifecycle safety against a real guarded PostgreSQL connection."""

import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import FastAPI, Request
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.db.session import Database
from app.main import create_app
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import Settings

pytestmark = pytest.mark.anyio


@asynccontextmanager
async def client_for(application: FastAPI) -> AsyncIterator[AsyncClient]:
    async with application.router.lifespan_context(application):
        async with AsyncClient(
            transport=ASGITransport(application, raise_app_exceptions=False),
            base_url="https://localhost",
        ) as client:
            yield client


def test_runtime_is_project_venv(monkeypatch: pytest.MonkeyPatch) -> None:
    assert Path(sys.prefix).resolve() == BACKEND_ROOT / ".venv"
    assert sys.version_info[:3] == (3, 14, 3)
    monkeypatch.setattr(sys, "prefix", str(BACKEND_ROOT))
    with pytest.raises(RuntimeError, match="backend/.venv"):
        require_venv()


@pytest.mark.postgres
async def test_live_ready_and_pool_lifecycle(settings: Settings) -> None:
    application = create_app(settings)
    async with client_for(application) as client:
        assert (await client.get("/api/v1/health/live")).json() == {"status": "live"}
        request_id = "f5104f81-0ee7-431d-975a-acb2bcd3bdc1"
        response = await client.get(
            "/api/v1/health/ready",
            headers={
                "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
                "X-Request-ID": request_id,
            },
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ready"}
        assert response.headers["x-request-id"] == request_id
        assert response.headers["cache-control"] == "no-store"
        resource: Database = application.state.database
        assert resource.engine.pool.checkedout() == 0  # type: ignore[attr-defined]
        assert not resource.closed
    assert resource.closed


@pytest.mark.postgres
async def test_failed_database_and_recovery_are_truthful(settings: Settings) -> None:
    broken = make_url(settings.selected_database_url()).set(port=1)
    # No DDL is performed. A refused real socket models unavailable PostgreSQL.
    unavailable = settings.model_copy(
        update={
            "app_environment": "development",
            "database_url": SecretStr(broken.render_as_string(hide_password=False)),
        }
    )
    async with client_for(create_app(unavailable)) as client:
        assert (await client.get("/api/v1/health/live")).status_code == 200
        response = await client.get(
            "/api/v1/health/ready",
            headers={
                "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
            },
        )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "DEPENDENCY_UNAVAILABLE"
        assert "password" not in response.text.lower()
        if settings.database_url.get_secret_value() in response.text:
            raise AssertionError("SENSITIVE_DATABASE_RESPONSE")
    async with client_for(create_app(settings)) as client:
        response = await client.get(
            "/api/v1/health/ready",
            headers={
                "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
            },
        )
        assert response.status_code == 200


@pytest.mark.postgres
@pytest.mark.parametrize("supplied", [None, "browser-forgery"])
async def test_ready_refuses_missing_or_forged_facade(
    settings: Settings, supplied: str | None
) -> None:
    async with client_for(create_app(settings)) as client:
        headers = {} if supplied is None else {"X-Kay-Facade-Secret": supplied}
        response = await client.get("/api/v1/health/ready", headers=headers)
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
        assert "traceback" not in response.text.lower()


@pytest.mark.postgres
async def test_invalid_input_and_unexpected_errors_are_redacted(
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    application = create_app(settings)

    @application.get("/invalid")
    def invalid(value: int) -> dict[str, int]:
        return {"value": value}

    @application.get("/failure")
    def failure(request: Request) -> None:
        raise RuntimeError("synthetic-sensitive-marker")

    async with client_for(application) as client:
        with caplog.at_level(logging.ERROR):
            invalid_response = await client.get("/invalid?value=synthetic-sensitive-marker")
            assert invalid_response.status_code == 422
            failure_response = await client.get("/failure")
            assert failure_response.status_code == 500
            for response in [invalid_response, failure_response, await client.get("/unknown")]:
                assert "synthetic-sensitive-marker" not in response.text
                assert response.headers["cache-control"] == "no-store"
                UUID(response.json()["error"]["request_id"])
            assert "synthetic-sensitive-marker" not in caplog.text
            if settings.facade_secret.get_secret_value() in caplog.text:
                raise AssertionError("SENSITIVE_FACADE_LOG")


@pytest.mark.postgres
def test_session_rollback_and_separate_connections(database: Database) -> None:
    with database.session() as first, database.session() as second:
        assert (
            first.execute(text("SELECT pg_backend_pid()")).scalar_one()
            != second.execute(text("SELECT pg_backend_pid()")).scalar_one()
        )
        first.execute(text("CREATE TEMP TABLE sp02_rollback_check (id integer)"))
        first.rollback()
        assert (
            first.execute(text("SELECT to_regclass('pg_temp.sp02_rollback_check')")).scalar_one()
            is None
        )
    assert database.engine.pool.checkedout() == 0  # type: ignore[attr-defined]
