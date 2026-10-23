import asyncio
import logging
import secrets
from collections.abc import Callable
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from typing import Annotated, ParamSpec, TypeVar
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from starlette.concurrency import run_in_threadpool

from app.db.session import Database
from app.identity.models import StaffSession
from app.identity.router import facade_authority, session_proof
from app.identity.security import TOKEN_PATTERN, IdentityError, token_hash
from app.identity.sessions import current_identity, identity_for_session
from app.realtime.models import PushSubscription, RealtimePresence, RealtimeTicket
from app.realtime.push import validate_endpoint, validate_key
from app.realtime.status import status
from app.realtime.transport import Hub

router = APIRouter(prefix="/api/v1/realtime")
P = ParamSpec("P")
T = TypeVar("T")


@router.get("/status", dependencies=[Depends(facade_authority)])
def diagnostics(
    request: Request, token: Annotated[str, Depends(session_proof)]
) -> dict[str, object]:
    database = request.app.state.database
    with database.session() as session:
        identity = current_identity(session, token)
        if identity.user.role != "administrator":
            raise IdentityError("FORBIDDEN", 403)
    hub = getattr(request.app.state, "realtime", None)
    if hub is None:
        return {"enabled": False}
    return {
        "enabled": True,
        **status(database),
        "process_sockets": len(hub.clients),
        "process_received": hub.received,
        "process_max_lag_ms": round(hub.max_lag_ms, 3),
        "process_listener_reconnects": hub.reconnects,
    }


def issue(database: Database, token: str) -> str:
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        identity = current_identity(session, token)
        session.scalar(
            select(StaffSession).where(StaffSession.id == identity.session.id).with_for_update()
        )
        session.execute(delete(RealtimeTicket).where(RealtimeTicket.expires_at <= now))
        count = session.scalar(
            select(func.count())
            .select_from(RealtimeTicket)
            .where(RealtimeTicket.session_id == identity.session.id)
        )
        if count and count >= 5:
            raise IdentityError("RATE_LIMITED", 429)
        ticket = secrets.token_urlsafe(32)
        session.add(
            RealtimeTicket(
                digest=token_hash(ticket),
                session_id=identity.session.id,
                expires_at=now + timedelta(seconds=30),
            )
        )
    return ticket


def consume(database: Database, ticket: str, cid: UUID) -> UUID:
    if not TOKEN_PATTERN.fullmatch(ticket):
        raise IdentityError("UNAUTHENTICATED", 401)
    now = datetime.now(UTC)
    with database.session() as session, session.begin():
        sid = session.scalar(
            delete(RealtimeTicket)
            .where(RealtimeTicket.digest == token_hash(ticket), RealtimeTicket.expires_at > now)
            .returning(RealtimeTicket.session_id)
        )
        if sid is None:
            raise IdentityError("UNAUTHENTICATED", 401)
        identity_for_session(session, sid)
        session.scalar(select(StaffSession).where(StaffSession.id == sid).with_for_update())
        session.execute(
            delete(RealtimePresence).where(RealtimePresence.seen_at < now - timedelta(seconds=60))
        )
        count = session.scalar(
            select(func.count())
            .select_from(RealtimePresence)
            .where(RealtimePresence.session_id == sid)
        )
        if count and count >= 5:
            raise IdentityError("RATE_LIMITED", 429)
        session.add(RealtimePresence(connection_id=cid, session_id=sid, seen_at=now))
        return sid


def check(database: Database, sid: UUID, cid: UUID, visible: bool) -> tuple[str, str]:
    with database.session() as session, session.begin():
        identity = identity_for_session(session, sid)
        statement = insert(RealtimePresence).values(
            connection_id=cid, session_id=sid, seen_at=datetime.now(UTC), visible=visible
        )
        session.execute(
            statement.on_conflict_do_update(
                index_elements=["connection_id"],
                set_={"seen_at": statement.excluded.seen_at, "visible": visible},
            )
        )
        return identity.user.role, str(identity.user.id)


@router.post("/tickets", dependencies=[Depends(facade_authority)])
def ticket(request: Request, token: Annotated[str, Depends(session_proof)]) -> dict[str, object]:
    if not request.app.state.settings.realtime_enabled:
        return {"enabled": False}
    return {"enabled": True, "ticket": issue(request.app.state.database, token)}


@router.websocket("/ws")
async def socket(ws: WebSocket) -> None:
    settings = ws.app.state.settings
    hub: Hub | None = getattr(ws.app.state, "realtime", None)
    if (
        not settings.realtime_enabled
        or hub is None
        or ws.headers.get("origin") != settings.frontend_origin
    ):
        logging.getLogger("kay.realtime").info("REALTIME_HANDSHAKE_DENIED")
        await ws.close(code=1008)
        return
    # Bound unauthenticated connections before accepting any credential frame.
    if (
        len(hub.clients) + ws.app.state.realtime_pending >= 500
        or ws.app.state.realtime_pending >= 25
    ):
        await ws.close(code=1013)
        return
    ws.app.state.realtime_pending += 1
    cid, sid = uuid4(), None
    pending = True
    incoming: asyncio.Task[str] | None = None
    waiting: asyncio.Task[set[str]] | None = None

    def admitted(operation: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
        if hub.admission and not hub.admission.enter():
            raise IdentityError("DEPENDENCY_UNAVAILABLE", 503)
        try:
            return operation(*args, **kwargs)
        finally:
            if hub.admission:
                hub.admission.leave()

    try:
        await ws.accept()
        message = await asyncio.wait_for(ws.receive_text(), timeout=5)
        if len(message) > 256:
            raise ValueError("FRAME_LIMIT")
        body = AuthFrame.model_validate_json(message)
        sid = await run_in_threadpool(admitted, consume, hub.database, body.ticket, cid)
        _, uid = await run_in_threadpool(admitted, check, hub.database, sid, cid, True)
        queue: asyncio.Queue[set[str]] = asyncio.Queue(maxsize=1)
        hub.clients[cid] = queue
        hub.users[cid] = uid
        ws.app.state.realtime_pending -= 1
        pending = False
        await asyncio.wait_for(ws.send_json({"type": "ready"}), timeout=5)
        incoming = asyncio.create_task(ws.receive_text())
        visible = True
        while True:
            waiting = asyncio.create_task(queue.get())
            done, _ = await asyncio.wait(
                {incoming, waiting}, timeout=20, return_when=asyncio.FIRST_COMPLETED
            )
            if incoming in done:
                incoming.result()  # Observe disconnect immediately, including between heartbeats.
                raise ValueError("UNSOLICITED_FRAME")
            topics = waiting.result() if waiting in done else set()
            if waiting not in done:
                waiting.cancel()
                with suppress(asyncio.CancelledError):
                    await waiting
            waiting = None
            role, _ = await run_in_threadpool(admitted, check, hub.database, sid, cid, visible)
            while not queue.empty():
                topics |= queue.get_nowait()
            if role == "agent":
                topics -= {"finance", "imports", "exports", "identity"}
            if topics:
                await asyncio.wait_for(
                    ws.send_json({"type": "invalidate", "topics": sorted(topics)}), timeout=5
                )
            await asyncio.wait_for(ws.send_json({"type": "ping"}), timeout=5)
            message = await asyncio.wait_for(incoming, timeout=25)
            if len(message) > 128:
                raise ValueError("FRAME_LIMIT")
            visible = PongFrame.model_validate_json(message).visible
            incoming = asyncio.create_task(ws.receive_text())
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception:
        logging.getLogger("kay.realtime").info("REALTIME_SOCKET_CLOSED_BY_POLICY")
        with suppress(Exception):
            await ws.close(code=1008)
    finally:
        for task in (incoming, waiting):
            if task:
                task.cancel()
                with suppress(asyncio.CancelledError, Exception):
                    await task
        if pending:
            ws.app.state.realtime_pending -= 1
        hub.clients.pop(cid, None)
        hub.users.pop(cid, None)
        if sid:

            def remove() -> None:
                with hub.database.session() as session, session.begin():
                    session.execute(
                        delete(RealtimePresence).where(RealtimePresence.connection_id == cid)
                    )

            with suppress(Exception):
                await run_in_threadpool(admitted, remove)


class AuthFrame(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    ticket: str = Field(min_length=43, max_length=43)


class PongFrame(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    type: str = Field(pattern="^pong$")
    visible: bool


class SubscriptionBody(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    operation: str = Field(pattern="^(subscribe|unsubscribe)$")
    endpoint: str = Field(max_length=2048)
    p256dh: str | None = Field(default=None, max_length=128)
    auth: str | None = Field(default=None, max_length=64)


@router.get("/push", dependencies=[Depends(facade_authority)])
def push_config(
    request: Request, token: Annotated[str, Depends(session_proof)]
) -> dict[str, object]:
    config = request.app.state.settings
    with request.app.state.database.session() as session:
        identity = current_identity(session, token)
        subscribed = False
        if config.web_push_enabled:
            subscribed = (
                session.scalar(
                    select(PushSubscription.id)
                    .where(
                        PushSubscription.session_id == identity.session.id, PushSubscription.active
                    )
                    .limit(1)
                )
                is not None
            )
    return {
        "enabled": config.web_push_enabled,
        "public_key": config.vapid_public_key,
        "subscribed": subscribed,
    }


@router.post("/push", dependencies=[Depends(facade_authority)])
def subscribe(
    body: SubscriptionBody, request: Request, token: Annotated[str, Depends(session_proof)]
) -> dict[str, bool]:
    if not request.app.state.settings.web_push_enabled:
        raise IdentityError("FORBIDDEN", 403)
    try:
        validate_endpoint(body.endpoint)
        if body.operation == "subscribe":
            validate_key(body.p256dh or "", 65)
            validate_key(body.auth or "", 16)
    except ValueError:
        raise IdentityError("VALIDATION_ERROR", 422) from None
    with request.app.state.database.session() as session, session.begin():
        identity = current_identity(session, token)
        session.scalar(
            select(StaffSession).where(StaffSession.id == identity.session.id).with_for_update()
        )
        sub = session.scalar(
            select(PushSubscription)
            .where(PushSubscription.endpoint == body.endpoint)
            .with_for_update()
        )
        if body.operation == "subscribe" and (
            sub is None or sub.session_id != identity.session.id or not sub.active
        ):
            count = session.scalar(
                select(func.count())
                .select_from(PushSubscription)
                .where(PushSubscription.session_id == identity.session.id, PushSubscription.active)
            )
            if count and count >= 5:
                raise IdentityError("RATE_LIMITED", 429)
        if body.operation == "unsubscribe":
            if sub and sub.session_id == identity.session.id:
                sub.active = False
        elif sub:
            sub.session_id, sub.active = identity.session.id, True
            sub.p256dh, sub.auth = body.p256dh or "", body.auth or ""
            sub.created_at = datetime.now(UTC)
        else:
            session.add(
                PushSubscription(
                    session_id=identity.session.id,
                    endpoint=body.endpoint,
                    p256dh=body.p256dh or "",
                    auth=body.auth or "",
                    active=True,
                    created_at=datetime.now(UTC),
                )
            )
    return {"saved": True}
