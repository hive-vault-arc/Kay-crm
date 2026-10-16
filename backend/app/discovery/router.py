from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response

from app.contacts.contracts import StrictBody
from app.contacts.router import Proof, configuration
from app.discovery.audit import read_audit
from app.discovery.contracts import AuditQuery, NewExport, PageQuery, SearchQuery
from app.discovery.exports import download, issue_download, read_exports, request_export
from app.discovery.search import search
from app.files.router import transfer_proof
from app.identity.router import facade_authority
from app.inventory.router import validate_query
from app.settings import Settings

router = APIRouter(prefix="/api/v1", dependencies=[Depends(facade_authority)])
transfers = APIRouter(prefix="/api/v1/transfers/exports")
RetryKey = Annotated[UUID, Header(alias="Idempotency-Key")]


@router.get("/search")
def find(
    request: Request, token: Proof, query: Annotated[SearchQuery, Query()]
) -> dict[str, object]:
    validate_query(request, set(SearchQuery.model_fields))
    return search(configuration(request)[0], token, query)


@router.get("/audit/events")
def audit(
    request: Request, token: Proof, query: Annotated[AuditQuery, Query()]
) -> dict[str, object]:
    validate_query(request, set(AuditQuery.model_fields))
    return read_audit(configuration(request)[0], token, query)


@router.post("/exports")
def create(request: Request, token: Proof, key: RetryKey, body: NewExport) -> dict[str, object]:
    validate_query(request, set())
    return request_export(configuration(request)[0], token, key, body)


@router.get("/exports")
def listing(
    request: Request, token: Proof, query: Annotated[PageQuery, Query()]
) -> dict[str, object]:
    validate_query(request, set(PageQuery.model_fields))
    return read_exports(configuration(request)[0], token, query)


@router.get("/exports/{eid}")
def detail(request: Request, token: Proof, eid: UUID) -> dict[str, object]:
    validate_query(request, set())
    return read_exports(configuration(request)[0], token, PageQuery(), eid)


@router.post("/exports/{eid}/download-permit")
def permit(request: Request, token: Proof, eid: UUID, body: StrictBody) -> dict[str, str]:
    validate_query(request, set())
    return issue_download(
        configuration(request)[0], token, eid, request.headers.get("X-CSRF-Token", "")
    ) | {"transfer_url": f"{str(request.base_url).rstrip('/')}/api/v1/transfers/exports/{eid}"}


@transfers.get("/{eid}")
def transfer(request: Request, eid: UUID) -> Response:
    validate_query(request, set())
    raw = transfer_proof(request)
    data = download(
        configuration(request)[0],
        cast(Settings, request.app.state.settings),
        eid,
        raw,
        request.headers.get("X-File-Session", ""),
    )
    return Response(
        data,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="kay-export-{eid}.csv"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )
