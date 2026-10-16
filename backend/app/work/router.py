"""Explicit internal work routes use the existing session/facade and CSRF boundary."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.sessions import current_identity
from app.schedule.contracts import Strict
from app.schedule.router import no_query
from app.work.commands import command
from app.work.contracts import (
    EditTask,
    NewTask,
    NotificationQuery,
    PageQuery,
    TaskAction,
    TaskQuery,
)
from app.work.notifications import mark_read, read_notifications
from app.work.queries import clock_context, detail, follow_up, read_tasks

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["work"])


@router.get("/work/context")
def context(request: Request, token: Proof) -> dict[str, str]:
    no_query(request)
    with configuration(request)[0].session() as session:
        current_identity(session, token)
    return clock_context()


@router.get("/tasks")
def tasks(
    request: Request, token: Proof, query: Annotated[TaskQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_tasks(configuration(request)[0], token, query)


@router.post("/tasks")
def create(request: Request, token: Proof, key: RetryKey, body: NewTask) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body)


@router.get("/tasks/{tid}")
def task(request: Request, token: Proof, tid: UUID) -> dict[str, object]:
    no_query(request)
    return detail(configuration(request)[0], token, tid)


@router.get("/tasks/{tid}/history")
def history(
    request: Request, token: Proof, tid: UUID, query: Annotated[PageQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return detail(configuration(request)[0], token, tid, query)


@router.patch("/tasks/{tid}")
def edit(
    request: Request, token: Proof, key: RetryKey, tid: UUID, body: EditTask
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, tid)


@router.post("/tasks/{tid}/complete")
def complete(
    request: Request, token: Proof, key: RetryKey, tid: UUID, body: TaskAction
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, tid, "completed")


@router.post("/tasks/{tid}/cancel")
def cancel(
    request: Request, token: Proof, key: RetryKey, tid: UUID, body: TaskAction
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, tid, "cancelled")


@router.get("/notifications")
def notifications(
    request: Request, token: Proof, query: Annotated[NotificationQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_notifications(configuration(request)[0], token, query)


@router.post("/notifications/{nid}/read")
def read(request: Request, token: Proof, nid: UUID, body: Strict) -> dict[str, bool]:
    no_query(request)
    return mark_read(configuration(request)[0], token, nid)


@router.get("/visits/follow-up")
def unresolved(
    request: Request, token: Proof, query: Annotated[PageQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return follow_up(configuration(request)[0], token, query)
