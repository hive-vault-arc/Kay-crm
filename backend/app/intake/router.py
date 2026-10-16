from fastapi import APIRouter, Request
from pydantic import ValidationError

from app.identity.security import IdentityError
from app.intake.authentication import consume_budget, verify
from app.intake.configuration import SigningKey, load_key
from app.intake.contracts import ReceiptQuery, Submission
from app.intake.service import receipt_status, receive

router = APIRouter(prefix="/api/v1/intake/website")


async def authenticated(request: Request, source_key: str) -> tuple[SigningKey, bytes]:
    consume_budget(
        request.app.state.database, request.app.state.settings.facade_secret.get_secret_value()
    )
    try:
        key = load_key(request.app.state.settings)
    except RuntimeError:
        raise IdentityError("INTAKE_AUTHENTICATION_FAILED", 401) from None
    body = await request.body()
    if len(body) > 8192 or request.headers.get("content-type") != "application/json":
        raise IdentityError("VALIDATION_ERROR", 422)
    verify(
        key,
        source_key,
        request.headers.get("X-Kay-Timestamp", ""),
        request.headers.get("X-Kay-Signature", ""),
        body,
    )
    return key, body


@router.post("/{source_key}", status_code=202)
async def submit(request: Request, source_key: str) -> dict[str, str]:
    key, body = await authenticated(request, source_key)
    try:
        data = Submission.model_validate_json(body)
    except ValidationError:
        raise IdentityError("VALIDATION_ERROR", 422) from None
    return receive(request.app.state.database, key, body, data)


@router.post("/{source_key}/receipt")
async def status(request: Request, source_key: str) -> dict[str, str]:
    key, body = await authenticated(request, source_key)
    try:
        query = ReceiptQuery.model_validate_json(body)
    except ValidationError:
        raise IdentityError("VALIDATION_ERROR", 422) from None
    return receipt_status(request.app.state.database, key, query.receipt_id)
