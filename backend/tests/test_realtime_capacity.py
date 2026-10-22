"""Socket capacity smoke; the populated Locust benchmark remains a separate gate."""

import asyncio
import secrets
from contextlib import ExitStack
from datetime import UTC, datetime, timedelta
from time import perf_counter, sleep
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.identity.models import AGENCY_ID, Credential, StaffSession, User
from app.identity.security import token_hash
from app.main import create_app
from app.realtime.router import issue
from app.realtime.status import status
from tests.identity_support import create_actor

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_hundred_live_accounts_and_bounded_pool(settings, database):
    template_id, _, _ = create_actor(settings, database)
    now = datetime.now(UTC)
    tokens = []
    with database.session() as session, session.begin():
        encoded = session.scalar(
            select(Credential.password_hash).where(Credential.user_id == template_id)
        )
        for _ in range(100):
            uid = uuid4()
            token = secrets.token_urlsafe(32)
            session.add(
                User(
                    id=uid,
                    agency_id=AGENCY_ID,
                    display_name="Compte synthétique de capacité",
                    email=f"sp03-{uid.hex}@example.com",
                    state="active",
                    role="agent",
                )
            )
            session.flush()
            session.add(Credential(user_id=uid, password_hash=encoded, must_change_password=False))
            session.add(
                StaffSession(
                    user_id=uid,
                    token_hash=token_hash(token),
                    created_at=now,
                    expires_at=now + timedelta(days=7),
                    user_version=1,
                    credential_version=1,
                    role_at_login="agent",
                )
            )
            tokens.append(token)
    app = create_app(settings.model_copy(update={"realtime_enabled": True}))
    with (
        TestClient(app, backend_options={"loop_factory": asyncio.SelectorEventLoop}) as client,
        ExitStack() as stack,
    ):
        sockets = []
        for token in tokens:
            socket = stack.enter_context(
                client.websocket_connect(
                    "/api/v1/realtime/ws", headers={"Origin": settings.frontend_origin}
                )
            )
            socket.send_json({"ticket": issue(database, token)})
            assert socket.receive_json() == {"type": "ready"}
            sockets.append(socket)
        assert len(app.state.realtime.clients) == 100
        timings = []
        for token in tokens:
            started = perf_counter()
            response = client.get(
                "/api/v1/auth/me",
                headers={
                    "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
                    "X-Kay-Session": token,
                },
            )
            assert response.status_code == 200
            timings.append(perf_counter() - started)
        assert sorted(timings)[94] < 1
        assert app.state.database.engine.pool.size() == 5
        # Heartbeats briefly borrow pool slots; none may be held by idle sockets.
        deadline = perf_counter() + 3
        borrowed = app.state.database.engine.pool.checkedout()
        while borrowed and perf_counter() < deadline:
            sleep(0.02)
            borrowed = app.state.database.engine.pool.checkedout()
        assert borrowed == 0
        metrics = status(database)
        assert metrics["recent_sockets"] == 100
        assert metrics["database_connections"] < 15
        assert metrics["listener_connections"] == 1
        assert metrics["push_pending"] == 0
