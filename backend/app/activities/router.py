"""Scoped immutable interaction routes; shared facade/session/CSRF guards apply."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.activities.contracts import ActivityQuery, NewActivity
from app.activities.service import ActivityScope, append_activity, read_activities
from app.contacts.router import Proof, RetryKey, configuration, validate_query
from app.identity.router import facade_authority
from app.identity.security import IdentityError

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)], tags=["activities"])


@router.get("/enquiries/{target}/activities")
@router.get("/deals/{target}/activities")
@router.get("/deals/{target}/origin-activities")
def history(
    request: Request, token: Proof, target: UUID, query: Annotated[ActivityQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    scope: ActivityScope = "enquiries" if "/enquiries/" in request.url.path else "deals"
    return read_activities(
        configuration(request)[0],
        token,
        scope,
        target,
        query,
        origin=request.url.path.endswith("/origin-activities"),
    )


@router.post("/enquiries/{target}/activities")
@router.post("/deals/{target}/activities")
def create(
    request: Request, token: Proof, key: RetryKey, target: UUID, body: NewActivity
) -> dict[str, object]:
    if request.query_params:
        raise IdentityError("VALIDATION_ERROR", 422)
    database, secret = configuration(request)
    scope: ActivityScope = "enquiries" if "/enquiries/" in request.url.path else "deals"
    return append_activity(database, token, secret, key, scope, target, body)
