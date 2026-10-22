"""Generic, session-bound Web Push; inbox scope is rechecked immediately before sending."""

import base64
import logging
from datetime import UTC, datetime, timedelta
from urllib.parse import urlsplit

import requests
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]
from sqlalchemy import exists, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from app.db.session import Database
from app.files.models import Notification
from app.identity.models import StaffSession
from app.identity.security import IdentityError
from app.identity.sessions import identity_for_session
from app.realtime.models import PushDelivery, PushSubscription, RealtimePresence
from app.settings import Settings
from app.work.notifications import scope

PROVIDERS = {"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"}


def validate_endpoint(endpoint: str) -> str:
    parts = urlsplit(endpoint)
    host = parts.hostname or ""
    if (
        parts.scheme != "https"
        or parts.username
        or parts.password
        or parts.port not in (None, 443)
        or parts.fragment
        or host not in PROVIDERS
        or not parts.path.startswith("/")
    ):
        raise ValueError("INVALID_PUSH_ENDPOINT")
    return endpoint


def validate_key(value: str, size: int) -> str:
    try:
        raw = base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
    except ValueError:
        raise ValueError("INVALID_PUSH_KEY") from None
    if len(raw) != size or (size == 65 and raw[0] != 4):
        raise ValueError("INVALID_PUSH_KEY")
    if size == 65:
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw)
    return value


class NoRedirectSession(requests.Session):
    def request(self, *args: object, **kwargs: object):  # type: ignore[no-untyped-def]
        kwargs["allow_redirects"] = False
        return super().request(*args, **kwargs)  # type: ignore[arg-type]


def send(subscription: PushSubscription, config: Settings, tag: str) -> None:
    validate_endpoint(subscription.endpoint)
    if not config.vapid_private_key or not config.vapid_subject:
        raise RuntimeError("PUSH_CONFIGURATION_REQUIRED")
    with NoRedirectSession() as client:
        client.trust_env = False
        webpush(
            {
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data='{"title":"Nouvelle notification KAY","tag":"' + tag + '"}',
            vapid_private_key=config.vapid_private_key.get_secret_value(),
            vapid_claims={"sub": config.vapid_subject},
            timeout=5,
            ttl=300,
            requests_session=client,
        )


def run_once(database: Database, config: Settings) -> bool:
    if not config.web_push_enabled:
        return False
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        session.execute(
            update(PushDelivery)
            .where(
                PushDelivery.state == "running",
                PushDelivery.lease_until < now,
                PushDelivery.attempts >= 5,
            )
            .values(state="failed", lease_until=None)
        )
        pairs = session.execute(
            select(
                Notification.id,
                PushSubscription.id,
                PushSubscription.session_id,
                Notification.created_at,
            )
            .join(StaffSession, StaffSession.user_id == Notification.user_id)
            .join(PushSubscription, PushSubscription.session_id == StaffSession.id)
            .where(
                PushSubscription.active,
                StaffSession.revoked_at.is_(None),
                StaffSession.expires_at > now,
                Notification.read_at.is_(None),
                Notification.created_at >= PushSubscription.created_at,
                Notification.created_at > now - timedelta(days=1),
                ~exists().where(
                    PushDelivery.notification_id == Notification.id,
                    PushDelivery.subscription_id == PushSubscription.id,
                ),
            )
            .limit(50)
        ).all()
        for nid, subid, sid, created in pairs:
            session.execute(
                insert(PushDelivery)
                .values(
                    notification_id=nid,
                    subscription_id=subid,
                    session_id=sid,
                    state="ready",
                    attempts=0,
                    available_at=created + timedelta(seconds=90),
                )
                .on_conflict_do_nothing()
            )
        job = session.scalar(
            select(PushDelivery)
            .where(
                or_(
                    PushDelivery.state == "ready",
                    (PushDelivery.state == "running") & (PushDelivery.lease_until < now),
                ),
                PushDelivery.available_at <= now,
                PushDelivery.attempts < 5,
            )
            .order_by(PushDelivery.available_at)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if job is None:
            return False
        job.state, job.lease_until = "running", now + timedelta(seconds=30)
        job.attempts += 1
        jid, attempt = job.id, job.attempts
    state, deactivate = "done", False
    try:
        with database.session() as session:
            sub = session.get(PushSubscription, job.subscription_id)
            identity = identity_for_session(session, job.session_id)
            notice = session.scalar(
                select(Notification).where(
                    Notification.id == job.notification_id,
                    Notification.read_at.is_(None),
                    scope(identity),
                )
            )
            present = session.scalar(
                select(RealtimePresence.connection_id)
                .join(StaffSession, StaffSession.id == RealtimePresence.session_id)
                .where(
                    StaffSession.user_id == identity.user.id,
                    StaffSession.revoked_at.is_(None),
                    StaffSession.expires_at > now,
                    RealtimePresence.visible,
                    RealtimePresence.seen_at > now - timedelta(seconds=60),
                )
                .limit(1)
            )
            if (
                sub is None
                or not sub.active
                or sub.session_id != job.session_id
                or notice is None
                or present
            ):
                state = "skipped"
        if state != "skipped" and sub is not None:
            send(sub, config, str(job.notification_id))
    except IdentityError:
        state = "skipped"
    except WebPushException as error:
        status = error.response.status_code if error.response is not None else 0
        deactivate = status in (404, 410)
        state = "failed" if deactivate or attempt >= 5 or 400 <= status < 429 else "ready"
        logging.getLogger("kay.realtime").warning(
            "WEB_PUSH_PROVIDER_RESPONSE status=%d attempt=%d", status, attempt
        )
    except Exception:
        state = "failed" if attempt >= 5 else "ready"
        logging.getLogger("kay.realtime").warning(
            "WEB_PUSH_PROVIDER_UNAVAILABLE attempt=%d", attempt
        )
    with database.session() as session, session.begin():
        current = session.get(PushDelivery, jid, with_for_update=True)
        if current and current.attempts == attempt and current.state == "running":
            current.state, current.lease_until = state, None
            current.available_at = datetime.now(UTC) + timedelta(seconds=min(300, 2**attempt * 10))
            if deactivate:
                sub = session.get(PushSubscription, current.subscription_id)
                if sub:
                    sub.active = False
    return True
