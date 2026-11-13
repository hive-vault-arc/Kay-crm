"""Staff commands for approved client listings and expiring anonymous links."""

import base64
import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.identity.models import AuditEvent
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity
from app.shares.contracts import ListingDraftInput, Snapshot, TargetKind
from app.shares.drafts import build_draft
from app.shares.inventory import (
    current_publication,
    make_snapshot,
    publication,
    target,
    target_ids,
)
from app.shares.models import ListingLink, ListingPublication

LINK_LIFETIME = timedelta(days=30)
MAX_ACTIVE_LINKS = 50


def manager(identity: CurrentIdentity) -> bool:
    return identity.user.role in {"manager", "administrator"}


def require_manager(identity: CurrentIdentity) -> None:
    if not manager(identity):
        raise IdentityError("FORBIDDEN", 403)


def audit(session: Session, actor: UUID, kind: TargetKind, identifier: UUID, action: str) -> None:
    prefix = "properties" if kind == "property" else "developments"
    session.add(
        AuditEvent(
            actor_user_id=actor, action=f"{prefix}.share_{action}", **target_ids(kind, identifier)
        )
    )


def status(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    *,
    include_draft: bool = False,
) -> dict[str, object]:
    record, parent = target(session, kind, identifier)
    item = publication(session, kind, identifier)
    active = item is not None and current_publication(item, record, parent)
    links = []
    if item is not None and active:
        query = select(ListingLink).where(
            ListingLink.publication_id == item.id,
            ListingLink.publication_version == item.version,
            ListingLink.expires_at > datetime.now(UTC),
            ListingLink.revoked_at.is_(None),
        )
        if not manager(identity):
            query = query.where(ListingLink.created_by == identity.user.id)
        for row in session.scalars(
            query.order_by(ListingLink.created_at.desc()).limit(MAX_ACTIVE_LINKS)
        ):
            links.append({"id": str(row.id), "expires_at": row.expires_at.isoformat()})
    return {
        "enabled": True,
        "can_approve": manager(identity),
        "active": active,
        "target_version": record.version,
        "version": item.version if item else 0,
        "snapshot": Snapshot.model_validate(item.snapshot).model_dump(mode="json")
        if item and (manager(identity) or active)
        else None,
        "links": links,
        **(
            {"draft": build_draft(session, kind, record)}
            if include_draft and manager(identity)
            else {}
        ),
    }


def approve(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    body: ListingDraftInput,
) -> ListingPublication:
    require_manager(identity)
    record, parent = target(session, kind, identifier, lock=True)
    item = publication(session, kind, identifier, lock=True)
    if record.version != body.target_version:
        raise IdentityError("INVENTORY_VERSION_CONFLICT", 409)
    snapshot = make_snapshot(session, kind, record, body).model_dump(mode="json")
    if item is not None and current_publication(item, record, parent) and item.snapshot == snapshot:
        return item
    if (item.version if item else 0) != body.expected_version:
        raise IdentityError("INVENTORY_VERSION_CONFLICT", 409)
    if item is None:
        item = ListingPublication(version=0, **target_ids(kind, identifier))
        session.add(item)
    item.approved_by = identity.user.id
    item.approved_at = datetime.now(UTC)
    item.target_version = record.version
    item.parent_version = parent
    item.withdrawn_at = None
    item.version += 1
    item.snapshot = snapshot
    audit(session, identity.user.id, kind, identifier, "approve")
    return item


def publish(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    body: ListingDraftInput,
    request_id: UUID,
    secret: str,
) -> dict[str, str]:
    item = approve(session, identity, kind, identifier, body)
    session.flush()
    return issue_link(session, identity, kind, identifier, item, request_id, secret)


def withdraw(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    expected: int,
) -> None:
    require_manager(identity)
    item = publication(session, kind, identifier, lock=True)
    if item is None or item.version != expected:
        raise IdentityError("INVENTORY_VERSION_CONFLICT", 409)
    if item.withdrawn_at is None:
        item.withdrawn_at = datetime.now(UTC)
        audit(session, identity.user.id, kind, identifier, "withdraw")


def link_token(secret: str, link: ListingLink) -> str:
    namespace = f"listing-link:v1:{link.id}:{link.publication_id}:{link.created_by}"
    mac = hmac.digest(secret.encode(), namespace.encode(), "sha256")
    return base64.urlsafe_b64encode(mac).rstrip(b"=").decode("ascii")


def digest(token: str) -> bytes:
    return hashlib.sha256(token.encode("ascii")).digest()


def issue(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    expected: int,
    request_id: UUID,
    secret: str,
) -> dict[str, str]:
    record, parent = target(session, kind, identifier, lock=True)
    item = publication(session, kind, identifier, lock=True)
    if item is None or item.version != expected or not current_publication(item, record, parent):
        raise IdentityError("LISTING_NOT_APPROVED", 409)
    return issue_link(session, identity, kind, identifier, item, request_id, secret)


def issue_link(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    item: ListingPublication,
    request_id: UUID,
    secret: str,
) -> dict[str, str]:
    now = datetime.now(UTC)
    link = session.get(ListingLink, request_id)
    if link is not None:
        if (
            link.publication_id != item.id
            or link.publication_version != item.version
            or link.created_by != identity.user.id
            or link.revoked_at
            or link.expires_at <= now
            or not hmac.compare_digest(link.token_hash, digest(link_token(secret, link)))
        ):
            raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
    else:
        active = (
            session.scalar(
                select(func.count())
                .select_from(ListingLink)
                .where(
                    ListingLink.publication_id == item.id,
                    ListingLink.publication_version == item.version,
                    ListingLink.expires_at > now,
                    ListingLink.revoked_at.is_(None),
                )
            )
            or 0
        )
        if active >= MAX_ACTIVE_LINKS:
            raise IdentityError("LISTING_LINK_LIMIT", 409)
        link = ListingLink(
            id=request_id,
            publication_id=item.id,
            publication_version=item.version,
            created_by=identity.user.id,
            created_at=now,
            expires_at=now + LINK_LIFETIME,
        )
        link.token_hash = digest(link_token(secret, link))
        try:
            with session.begin_nested():
                session.add(link)
                session.flush()
        except IntegrityError as error:
            if getattr(error.orig, "sqlstate", None) != "23505":
                raise
            raise IdentityError("IDEMPOTENCY_CONFLICT", 409) from None
        audit(session, identity.user.id, kind, identifier, "issue")
    return {"token": link_token(secret, link), "expires_at": link.expires_at.isoformat()}


def revoke(
    session: Session,
    identity: CurrentIdentity,
    kind: TargetKind,
    identifier: UUID,
    link_id: UUID,
) -> None:
    item = publication(session, kind, identifier, lock=True)
    link = session.get(ListingLink, link_id, with_for_update=True)
    if (
        item is None
        or link is None
        or link.publication_id != item.id
        or (link.created_by != identity.user.id and not manager(identity))
    ):
        raise IdentityError("NOT_FOUND", 404)
    if link.revoked_at is None:
        link.revoked_at = datetime.now(UTC)
        audit(session, identity.user.id, kind, identifier, "revoke")
