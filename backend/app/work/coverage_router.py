from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.contacts.contracts import StrictBody
from app.contacts.router import Proof, RetryKey, configuration
from app.identity.router import facade_authority
from app.inventory.router import validate_query
from app.work.coverage import (
    CoverageProof,
    Kind,
    NewCoverageNote,
    acknowledge_note,
    read_coverage,
    read_notes,
    write_note,
)

router = APIRouter(prefix="/api/v1/coverage", dependencies=[Depends(facade_authority)])


@router.post("/{kind}/{target}/view")
def view(
    kind: Kind, target: UUID, body: CoverageProof, request: Request, token: Proof
) -> dict[str, object]:
    validate_query(request, set())
    database, secret = configuration(request)
    return read_coverage(database, token, secret, kind, target, body)


@router.get("/{kind}/{target}/notes")
def notes(kind: Kind, target: UUID, request: Request, token: Proof) -> dict[str, object]:
    validate_query(request, set())
    return read_notes(configuration(request)[0], token, kind, target)


@router.post("/{kind}/{target}/notes")
def create(
    kind: Kind, target: UUID, body: NewCoverageNote, request: Request, token: Proof, key: RetryKey
) -> dict[str, str]:
    validate_query(request, set())
    database, secret = configuration(request)
    return write_note(database, token, secret, kind, target, body, key)


@router.post("/{kind}/{target}/notes/{note_id}/seen")
def seen(
    kind: Kind, target: UUID, note_id: UUID, body: StrictBody, request: Request, token: Proof
) -> dict[str, bool]:
    validate_query(request, set())
    return acknowledge_note(configuration(request)[0], token, kind, target, note_id)
