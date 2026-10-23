"""Commit-only, content-free invalidation hints; REST rechecks record authority."""

import json
import logging
import queue
import threading
import time
from collections.abc import Callable
from typing import Any, cast

from sqlalchemy import event, inspect, select, text
from sqlalchemy.orm import ORMExecuteState, Session

from app.contacts.models import Contact, ContactCollaborator
from app.db.session import Database
from app.identity.models import User

CHANNEL = "kay_realtime_v1"
GROUPS = {
    "contacts": {
        "contact",
        "contact_phone",
        "contact_email",
        "contact_role",
        "contact_collaborator",
        "enquiry",
        "timeline_event",
        "assignment_event",
    },
    "deals": {
        "deal",
        "customer_offer",
        "deal_stage_event",
        "deal_project",
        "deal_outcome",
        "deal_reopening",
    },
    "inventory": {
        "property",
        "development",
        "offering",
        "block",
        "floor",
        "unit_type",
        "property_owner",
        "development_owner",
        "inventory_event",
        "reservation",
        "stock_outcome",
        "stock_effect",
        "stock_reversal",
    },
    "visits": {
        "visit",
        "visit_participant",
        "visit_event",
        "visit_schedule_event",
        "visit_schedule_policy",
        "visit_working_window",
        "visit_break_window",
    },
    "tasks": {"task", "task_event"},
    "notifications": {"notification"},
    "files": {"document", "document_version"},
    "imports": {"import_batch", "import_preview"},
    "exports": {"export_job"},
    "finance": {"commission", "commission_revision", "receipt"},
    "requirements": {"requirement", "requirement_criterion", "shortlist_entry"},
    "identity": {"user", "credential", "session"},
}
TOPICS = frozenset(GROUPS) | {"reports"}
SHARED = {"inventory", "identity", "visits"}


def topics_for(tables: set[str]) -> set[str]:
    topics = {topic for topic, names in GROUPS.items() if tables & names}
    if topics - {"identity", "notifications", "imports", "exports", "files"}:
        topics.add("reports")
    return topics


def install(database: Database) -> Callable[[], None]:
    pending: queue.Queue[dict[str, set[str]]] = queue.Queue(maxsize=1)
    stopping = threading.Event()
    merge_lock = threading.Lock()

    def publish() -> None:
        while not stopping.is_set():
            try:
                hint = pending.get(timeout=0.5)
            except queue.Empty:
                continue
            try:
                with database.session() as session:
                    audience = select(User.id, User.role)
                    if "identity" not in hint["topics"]:
                        audience = audience.where(User.state == "active", User.deleted_at.is_(None))
                    users = session.execute(audience).all()
                    allowed = set(hint.get("users", set()))
                    contacts = hint.get("contacts", set())
                    if len(contacts) > 1000:
                        allowed.update(str(uid) for uid, _ in users)
                        contacts = set()
                    if contacts:
                        allowed.update(
                            str(uid)
                            for uid in session.scalars(
                                select(Contact.primary_agent_id).where(Contact.id.in_(contacts))
                            )
                        )
                        allowed.update(
                            str(uid)
                            for uid in session.scalars(
                                select(ContactCollaborator.user_id).where(
                                    ContactCollaborator.contact_id.in_(contacts),
                                    ContactCollaborator.revoked_at.is_(None),
                                )
                            )
                        )
                    payloads = []
                    for uid, role in users:
                        topics = set(hint["topics"])
                        if role == "agent":
                            topics -= {"finance", "imports", "exports"}
                            if str(uid) not in allowed:
                                topics &= SHARED | hint.get("shared", set())
                                if hint["topics"] & {"inventory", "visits"}:
                                    topics.add("reports")
                        if str(uid) not in hint.get("notifications", set()):
                            topics.discard("notifications")
                        elif "notifications" in hint["topics"]:
                            topics.add("notifications")
                        if topics:
                            payloads.append(
                                json.dumps(
                                    {
                                        "user": str(uid),
                                        "topics": sorted(topics),
                                        "committed_at": min(map(float, hint["committed_at"])),
                                    }
                                )
                            )
                if not payloads:
                    continue
                with database.engine.connect().execution_options(
                    isolation_level="AUTOCOMMIT"
                ) as conn:
                    conn.execute(
                        text(
                            "SELECT pg_notify(:channel, value) "
                            "FROM unnest(CAST(:payloads AS text[])) AS value"
                        ),
                        {"channel": CHANNEL, "payloads": payloads},
                    )
            except Exception:
                logging.getLogger("kay.realtime").warning("REALTIME_PUBLISH_UNAVAILABLE")

    publisher = threading.Thread(target=publish, name="kay-live-publisher", daemon=True)
    publisher.start()

    def flushed(session: Session, *_: object) -> None:
        tables = session.info.setdefault("live_tables", set())
        tables.update(obj.__table__.name for obj in session.new | session.dirty | session.deleted)
        for obj in (
            list(session.new)
            + list(session.dirty)
            + list(session.deleted)
            + list(session.identity_map.values())
        ):
            data = obj.__dict__
            contact_id = data.get("id") if isinstance(obj, Contact) else data.get("contact_id")
            if contact_id:
                session.info.setdefault("live_contacts", set()).add(str(contact_id))
            if isinstance(obj, (Contact, ContactCollaborator)):
                attribute = "primary_agent_id" if isinstance(obj, Contact) else "user_id"
                ids = list(cast(Any, inspect(obj)).attrs[attribute].history.deleted)
                ids.append(data.get(attribute))
                session.info.setdefault("live_users", set()).update(str(uid) for uid in ids if uid)
            if obj.__table__.name == "notification":
                session.info.setdefault("live_notifications", set()).add(str(data["user_id"]))
            if obj.__table__.name == "document" and (
                data.get("property_id") or data.get("development_id")
            ):
                session.info.setdefault("live_shared", set()).add("files")

    def executed(state: ORMExecuteState) -> None:
        if state.is_insert or state.is_update or state.is_delete:
            table = getattr(state.statement, "table", None)
            if table is not None:
                state.session.info.setdefault("live_tables", set()).add(table.name)
                if table.name == "notification":
                    params = cast(Any, state.statement).compile().params
                    uid = params.get("user_id")
                    if uid:
                        state.session.info.setdefault("live_notifications", set()).add(str(uid))

    def committed(session: Session) -> None:
        if session.in_nested_transaction():
            return
        topics = topics_for(session.info.pop("live_tables", set()))
        if not topics:
            return
        hint = {
            "topics": topics,
            "contacts": session.info.pop("live_contacts", set()),
            "users": session.info.pop("live_users", set()),
            "notifications": session.info.pop("live_notifications", set()),
            "shared": session.info.pop("live_shared", set()),
            "committed_at": {str(time.time())},
        }
        with merge_lock:
            try:
                previous = pending.get_nowait()
                for key in hint:
                    hint[key] |= previous.get(key, set())
            except queue.Empty:
                pass
            pending.put_nowait(hint)

    def rollback(session: Session, *_: object) -> None:
        if not session.in_nested_transaction():
            for key in ("tables", "contacts", "users", "notifications", "shared"):
                session.info.pop("live_" + key, None)

    def safe_flush(session: Session, *args: object) -> None:
        try:
            flushed(session, *args)
        except Exception:
            logging.getLogger("kay.realtime").warning("REALTIME_COLLECTION_UNAVAILABLE")

    def safe_execute(state: ORMExecuteState) -> None:
        try:
            executed(state)
        except Exception:
            logging.getLogger("kay.realtime").warning("REALTIME_COLLECTION_UNAVAILABLE")

    event.listen(database.sessions, "after_flush", safe_flush)
    event.listen(database.sessions, "before_commit", safe_flush)
    event.listen(database.sessions, "do_orm_execute", safe_execute)
    event.listen(database.sessions, "after_commit", committed)
    event.listen(database.sessions, "after_rollback", rollback)

    def stop() -> None:
        stopping.set()
        publisher.join(timeout=6)

    return stop
