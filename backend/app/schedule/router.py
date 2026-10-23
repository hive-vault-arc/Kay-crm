"""Explicit scheduling transport; authenticated reads and CSRF-protected commands."""

from datetime import UTC, datetime
from importlib.metadata import version
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.security import IdentityError
from app.identity.sessions import current_identity
from app.schedule.commands import Body, command
from app.schedule.contracts import (
    AvailabilityQuery,
    CalendarQuery,
    EditVisit,
    FinishVisit,
    NewVisit,
    PolicyEdit,
    PolicySave,
    VisitAction,
)
from app.schedule.local_time import resolve_local
from app.schedule.queries import availability, colleagues, detail, read_policy, read_visits
from app.schedule.rules import ZONE

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["schedule"])


@router.get("/calendar/context")
def calendar_context(request: Request, token: Proof) -> dict[str, object]:
    no_query(request)
    with configuration(request)[0].session() as session:
        current_identity(session, token)
    return {
        "today": datetime.now(UTC).astimezone(ZONE).date().isoformat(),
        "time_zone": "Africa/Casablanca",
        "tzdata_version": version("tzdata"),
    }


@router.get("/calendar/local-time")
def local_time(request: Request, token: Proof, local: str) -> dict[str, object]:
    validate_query(request)
    if set(request.query_params) != {"local"}:
        raise IdentityError("VALIDATION_ERROR", 422)
    with configuration(request)[0].session() as session:
        current_identity(session, token)
    return resolve_local(local)


def no_query(request: Request) -> None:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)


def mutate(
    request: Request,
    token: str,
    key: UUID,
    body: Body,
    vid: UUID | None = None,
    action: str = "updated",
) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return command(database, token, secret, key, body, vid, action)


@router.get("/visit-schedule/policy")
def policy(request: Request, token: Proof) -> dict[str, object]:
    no_query(request)
    return read_policy(configuration(request)[0], token)


@router.post("/visit-schedule/policy/preview")
def policy_preview(request: Request, token: Proof, body: PolicyEdit) -> dict[str, object]:
    no_query(request)
    database, secret = configuration(request)
    return read_policy(database, token, body, secret)


@router.put("/visit-schedule/policy")
def policy_save(
    request: Request, token: Proof, key: RetryKey, body: PolicySave
) -> dict[str, object]:
    return mutate(request, token, key, body)


@router.get("/visits")
def visits(
    request: Request, token: Proof, query: Annotated[CalendarQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_visits(configuration(request)[0], token, query)


@router.post("/visits")
def create(request: Request, token: Proof, key: RetryKey, body: NewVisit) -> dict[str, object]:
    return mutate(request, token, key, body)


@router.get("/visits/{vid}")
def visit(request: Request, token: Proof, vid: UUID) -> dict[str, object]:
    no_query(request)
    return detail(configuration(request)[0], token, vid)


@router.get("/visits/{vid}/history")
def history(request: Request, token: Proof, vid: UUID) -> dict[str, object]:
    no_query(request)
    return detail(configuration(request)[0], token, vid, history=True)


@router.patch("/visits/{vid}")
def edit(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: EditVisit
) -> dict[str, object]:
    return mutate(request, token, key, body, vid)


@router.post("/visits/{vid}/reschedule")
def reschedule(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: EditVisit
) -> dict[str, object]:
    return mutate(request, token, key, body, vid, "rescheduled")


@router.post("/visits/{vid}/confirm")
def confirm(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: VisitAction
) -> dict[str, object]:
    return mutate(request, token, key, body, vid, "confirmed")


@router.post("/visits/{vid}/complete")
def complete(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: FinishVisit
) -> dict[str, object]:
    return mutate(request, token, key, body, vid, "completed")


@router.post("/visits/{vid}/cancel")
def cancel(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: FinishVisit
) -> dict[str, object]:
    return mutate(request, token, key, body, vid, "cancelled")


@router.post("/visits/{vid}/not-completed")
def not_completed(
    request: Request, token: Proof, key: RetryKey, vid: UUID, body: FinishVisit
) -> dict[str, object]:
    return mutate(request, token, key, body, vid, "not_completed")


@router.get("/calendar/free-busy")
def free_busy(
    request: Request, token: Proof, query: Annotated[CalendarQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return read_visits(configuration(request)[0], token, query, busy=True)


@router.get("/calendar/availability")
def available(
    request: Request, token: Proof, query: Annotated[AvailabilityQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return availability(configuration(request)[0], token, query)


@router.get("/calendar/colleagues")
def staff(request: Request, token: Proof, contact_id: UUID | None = None) -> dict[str, object]:
    validate_query(request)
    if set(request.query_params) - {"contact_id"}:
        raise IdentityError("VALIDATION_ERROR", 422)
    return colleagues(configuration(request)[0], token, contact_id)
