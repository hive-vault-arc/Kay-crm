import asyncio
import json
import logging
import time
from contextlib import suppress
from uuid import UUID

import psycopg

from app.db.session import Database
from app.realtime.events import CHANNEL, TOPICS
from app.recovery.maintenance import Admission


class Hub:
    def __init__(self, database: Database, admission: Admission | None = None):
        self.database = database
        self.admission = admission
        self.clients: dict[UUID, asyncio.Queue[set[str]]] = {}
        self.users: dict[UUID, str] = {}
        self.received = 0
        self.max_lag_ms = 0.0
        self.reconnects = 0

    async def listen(self) -> None:
        _, kwargs = self.database.engine.dialect.create_connect_args(self.database.engine.url)
        kwargs.update(connect_timeout=3, options="-c timezone=UTC -c statement_timeout=2000")
        kwargs["application_name"] = "kay-realtime-listener"
        while True:
            try:
                async with await psycopg.AsyncConnection.connect(**kwargs, autocommit=True) as conn:
                    await conn.execute(f"LISTEN {CHANNEL}")
                    self.broadcast(set(TOPICS))
                    while True:
                        async for notice in conn.notifies(timeout=20):
                            hint = json.loads(notice.payload)
                            self.received += 1
                            lag = max(
                                0, (time.time() - hint.get("committed_at", time.time())) * 1000
                            )
                            self.max_lag_ms = max(self.max_lag_ms, lag)
                            self.broadcast(set(hint["topics"]) & TOPICS, hint["user"])
            except asyncio.CancelledError:
                raise
            except Exception:
                self.reconnects += 1
                logging.getLogger("kay.realtime").warning("REALTIME_LISTENER_UNAVAILABLE")
                await asyncio.sleep(3)

    def broadcast(self, topics: set[str], user: str | None = None) -> None:
        for cid, queue in tuple(self.clients.items()):
            if user is not None and self.users.get(cid) != user:
                continue
            combined = set(topics)
            with suppress(asyncio.QueueEmpty):
                combined |= queue.get_nowait()
            queue.put_nowait(combined)
