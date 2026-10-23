"""Aggregate operator diagnostics without session IDs, recipients or push endpoints."""

from datetime import UTC, datetime, timedelta
from typing import cast

from sqlalchemy import func, select, text

from app.db.session import Database
from app.realtime.models import PushDelivery, RealtimePresence


def status(database: Database) -> dict[str, int | float | None]:
    now = datetime.now(UTC)
    with database.session() as session:
        sockets = session.scalar(
            select(func.count())
            .select_from(RealtimePresence)
            .where(RealtimePresence.seen_at > now - timedelta(seconds=60))
        )
        connections, listeners = session.execute(
            text(
                "SELECT count(*), count(*) FILTER (WHERE application_name='kay-realtime-listener') "
                "FROM pg_stat_activity WHERE datname=current_database()"
            )
        ).one()
        pending, oldest = session.execute(
            select(func.count(), func.min(PushDelivery.available_at)).where(
                PushDelivery.state.in_(("ready", "running"))
            )
        ).one()
        return {
            "recent_sockets": sockets or 0,
            "database_connections": cast(int, connections),
            "listener_connections": cast(int, listeners),
            "push_pending": pending,
            "push_oldest_due_seconds": max(0, (now - oldest).total_seconds()) if oldest else None,
        }
