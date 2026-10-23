"""FastAPI composition root for the local transport/database foundation."""

import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import ClientDisconnect

from app.activities.router import router as activities_router
from app.contacts.access import ContactConflict
from app.contacts.ownership_router import router as ownership_router
from app.contacts.router import router as contacts_router
from app.db.isolation import assert_runtime_target
from app.db.session import Database
from app.deals.router import router as deals_router
from app.discovery.router import router as discovery_router
from app.discovery.router import transfers as export_transfers
from app.errors import error_response
from app.files.router import router as files_router
from app.files.router import transfers as transfer_router
from app.finance.router import router as finance_router
from app.generated.router import router as generated_router
from app.health import router
from app.identity.router import router as identity_router
from app.identity.security import IdentityError, dummy_hash
from app.identity.users_router import router as users_router
from app.imports.router import router as imports_router
from app.imports.router import transfers as import_transfers
from app.intake.router import router as intake_router
from app.inventory.hierarchy_router import router as hierarchy_router
from app.inventory.router import router as inventory_router
from app.project_links.router import router as project_links_router
from app.realtime.router import router as realtime_router
from app.recovery.maintenance import MaintenanceMiddleware
from app.reports.router import router as reports_router
from app.requirements.router import router as requirements_router
from app.schedule.router import router as schedule_router
from app.settings import Settings, load_settings
from app.work.router import router as work_router

logger = logging.getLogger("kay.requests")


def create_app(settings: Settings | None = None) -> FastAPI:
    """No connection at import time; an unavailable DB must not kill liveness."""
    config = settings if settings is not None else load_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        assert_runtime_target(config)
        dummy_hash()  # Equal verification work for unknown identities, including the first request.
        database = Database(config.selected_database_url())
        application.state.database = database
        application.state.realtime_pending = 0
        live_task = None
        stop_publisher = None
        if config.realtime_enabled:
            import asyncio

            from app.realtime.events import install
            from app.realtime.transport import Hub

            stop_publisher = install(database)
            from app.recovery.maintenance import Admission

            application.state.realtime = Hub(database, Admission(config))
            live_task = asyncio.create_task(application.state.realtime.listen())
        try:
            yield
        finally:
            if live_task:
                import contextlib

                live_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await live_task
            if stop_publisher:
                stop_publisher()
            database.close()

    application = FastAPI(
        title="KAY local API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    application.state.settings = config
    application.include_router(router)
    application.include_router(identity_router)
    application.include_router(users_router)
    application.include_router(contacts_router)
    application.include_router(ownership_router)
    application.include_router(inventory_router)
    application.include_router(hierarchy_router)
    application.include_router(files_router)
    application.include_router(generated_router)
    application.include_router(requirements_router)
    application.include_router(deals_router)
    application.include_router(project_links_router)
    application.include_router(activities_router)
    application.include_router(finance_router)
    application.include_router(work_router)
    application.include_router(realtime_router)
    application.include_router(reports_router)
    application.include_router(imports_router)
    application.include_router(import_transfers)
    application.include_router(intake_router)
    application.include_router(discovery_router)
    application.include_router(export_transfers)
    application.include_router(schedule_router)
    application.include_router(transfer_router)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[config.frontend_origin],
        allow_methods=["PUT", "GET"],
        allow_headers=["X-File-Permit", "X-File-Session", "Content-Type"],
        expose_headers=["Content-Disposition"],
        allow_credentials=False,
    )
    application.middleware("http")(request_context)
    application.add_middleware(MaintenanceMiddleware, settings=config)
    application.add_exception_handler(HTTPException, safe_http_error)
    application.add_exception_handler(RequestValidationError, safe_validation_error)
    application.add_exception_handler(IdentityError, safe_identity_error)
    application.add_exception_handler(SQLAlchemyError, safe_identity_error)
    return application


async def request_context(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    """Correlate without logging bodies, URLs, headers, secrets or exception text."""
    try:
        request_id = str(UUID(request.headers.get("X-Request-ID", "")))
    except ValueError:
        request_id = str(uuid4())
    request.state.request_id = request_id
    try:
        if request.url.path.startswith(
            (
                "/api/v1/auth/",
                "/api/v1/realtime/",
                "/api/v1/users",
                "/api/v1/contacts",
                "/api/v1/requirements",
                "/api/v1/deals",
                "/api/v1/visits",
                "/api/v1/visit-schedule",
                "/api/v1/calendar",
                "/api/v1/tasks",
                "/api/v1/notifications",
                "/api/v1/work",
                "/api/v1/customer-offers",
                "/api/v1/enquiries",
                "/api/v1/properties",
                "/api/v1/offerings",
                "/api/v1/developments",
                "/api/v1/blocks",
                "/api/v1/floors",
                "/api/v1/unit-types",
                "/api/v1/files/",
                "/api/v1/documents",
                "/api/v1/imports",
                "/api/v1/intake/",
                "/api/v1/exports",
            )
        ):
            limit = (
                131072
                if request.url.path.startswith(
                    (
                        "/api/v1/properties",
                        "/api/v1/offerings",
                        "/api/v1/developments",
                        "/api/v1/blocks",
                        "/api/v1/floors",
                        "/api/v1/unit-types",
                    )
                )
                else 32768
                if request.url.path.startswith(
                    (
                        "/api/v1/contacts",
                        "/api/v1/enquiries",
                        "/api/v1/deals",
                        "/api/v1/customer-offers",
                        "/api/v1/visits",
                        "/api/v1/tasks",
                        "/api/v1/visit-schedule",
                        "/api/v1/imports",
                    )
                )
                else 8192
            )
            length = request.headers.get("Content-Length", "0")
            if not length.isdecimal() or int(length) > limit:
                return error_response(413, "VALIDATION_ERROR", request_id)
            # Read a bounded body before Pydantic; chunked requests have no trusted length.
            size = 0
            chunks = []
            async for chunk in request.stream():
                size += len(chunk)
                if size > limit:
                    return error_response(413, "VALIDATION_ERROR", request_id)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
    except Exception as error:
        if request.url.path.startswith("/api/v1/transfers/") and interrupted_transfer(error):
            response = error_response(503, "FILE_TRANSFER_INTERRUPTED", request_id)
        else:
            logger.error(
                "request_id=%s code=INTERNAL_ERROR kind=%s", request_id, type(error).__name__
            )
            response = error_response(500, "INTERNAL_ERROR", request_id)
    response.headers["X-Request-ID"] = request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def interrupted_transfer(error: BaseException) -> bool:
    if isinstance(error, BaseExceptionGroup):
        return bool(error.exceptions) and all(
            interrupted_transfer(item) for item in error.exceptions
        )
    return isinstance(error, (OSError, TimeoutError, ClientDisconnect))


async def safe_identity_error(request: Request, exception: Exception) -> Response:
    if isinstance(exception, ContactConflict):
        return error_response(
            exception.status, exception.code, request.state.request_id, exception.details
        )
    if isinstance(exception, IdentityError):
        return error_response(exception.status, exception.code, request.state.request_id)
    return error_response(503, "DEPENDENCY_UNAVAILABLE", request.state.request_id)


async def safe_http_error(request: Request, exception: Exception) -> Response:
    """Normalize framework errors without echoing arbitrary detail."""
    if not isinstance(exception, HTTPException):
        return error_response(500, "INTERNAL_ERROR", request.state.request_id)
    codes = {403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}
    return error_response(
        exception.status_code,
        codes.get(exception.status_code, "INTERNAL_ERROR"),
        request.state.request_id,
    )


async def safe_validation_error(request: Request, exception: Exception) -> Response:
    """Validation failure fields must not echo rejected secret-bearing input."""
    return error_response(422, "VALIDATION_ERROR", request.state.request_id)


# Standard Uvicorn import target; connections remain owned by the ASGI lifespan.
app = create_app()
