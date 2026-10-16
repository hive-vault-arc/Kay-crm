"""Read-only report endpoints retain current session and strict query authority."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.contacts.router import Proof, configuration, validate_query
from app.identity.router import facade_authority
from app.reports.contracts import ActivityQuery, DrillQuery, ExceptionQuery, PeriodQuery
from app.reports.queries import dashboard, drill_down, exception_list

router = APIRouter(prefix="/api/v1/reports", dependencies=[Depends(facade_authority)])


@router.get("/dashboard")
def overview(
    request: Request, token: Proof, query: Annotated[PeriodQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return dashboard(configuration(request)[0], token, query)


@router.get("/drill-down")
def detail(
    request: Request, token: Proof, query: Annotated[DrillQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return drill_down(configuration(request)[0], token, query)


@router.get("/activities")
def activities(
    request: Request, token: Proof, query: Annotated[ActivityQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return drill_down(
        configuration(request)[0], token, DrillQuery(metric="activities", **query.model_dump())
    )


@router.get("/exceptions")
def alerts(
    request: Request, token: Proof, query: Annotated[ExceptionQuery, Query()]
) -> dict[str, object]:
    validate_query(request)
    return exception_list(configuration(request)[0], token, query)
