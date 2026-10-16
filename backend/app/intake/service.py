import hashlib
import hmac
from uuid import UUID, uuid4

from sqlalchemy import select

from app.db.session import Database
from app.files.models import OutboxEvent
from app.identity.models import AGENCY_ID, Agency
from app.identity.security import IdentityError
from app.intake.configuration import SigningKey
from app.intake.contracts import Submission
from app.intake.models import WebsiteReceipt, WebsiteSource


def public_receipt(row: WebsiteReceipt) -> dict[str, str]:
    return {"receipt_id": str(row.id), "state": row.state}


def receive(database: Database, key: SigningKey, body: bytes, data: Submission) -> dict[str, str]:
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        authority = session.scalar(
            select(WebsiteSource)
            .where(WebsiteSource.source_key == key.source_key)
            .with_for_update()
        )
        if (
            authority is None
            or not authority.active
            or not hmac.compare_digest(authority.key_digest, key.digest())
        ):
            raise IdentityError("INTAKE_AUTHENTICATION_FAILED", 401)
        if data.source is not None and data.source != key.source_key:
            raise IdentityError("VALIDATION_ERROR", 422)
        digest = hashlib.sha256(body).digest()
        row = session.scalar(
            select(WebsiteReceipt).where(
                WebsiteReceipt.source_id == authority.id,
                WebsiteReceipt.submission_id == data.submission_id,
            )
        )
        if row:
            if not hmac.compare_digest(row.request_hash, digest):
                raise IdentityError("INTAKE_SUBMISSION_CONFLICT", 409)
            return public_receipt(row)
        row = WebsiteReceipt(
            id=uuid4(),
            source_id=authority.id,
            submission_id=data.submission_id,
            request_hash=digest,
            payload=data.model_dump(mode="json"),
            state="queued",
        )
        session.add(row)
        session.flush()
        session.add(
            OutboxEvent(
                kind="website.process",
                website_receipt_id=row.id,
                dedupe_key=f"website.process:{row.id}",
            )
        )
        session.flush()
        return public_receipt(row)


def receipt_status(database: Database, key: SigningKey, rid: UUID) -> dict[str, str]:
    with database.session() as session:
        authority = session.scalar(
            select(WebsiteSource).where(
                WebsiteSource.source_key == key.source_key, WebsiteSource.active.is_(True)
            )
        )
        if not authority or not hmac.compare_digest(authority.key_digest, key.digest()):
            raise IdentityError("INTAKE_AUTHENTICATION_FAILED", 401)
        row = session.scalar(
            select(WebsiteReceipt).where(
                WebsiteReceipt.id == rid, WebsiteReceipt.source_id == authority.id
            )
        )
        if not row:
            raise IdentityError("NOT_FOUND", 404)
        return public_receipt(row)
