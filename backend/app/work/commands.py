"""One transaction owns task authority, versions, history, outbox and retry receipt."""

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity
from app.work.contracts import EditTask, NewTask, TaskAction
from app.work.models import Task, TaskReceipt
from app.work.records import append_event, authorized, check_context
from app.work.reminders import synchronize

Body = NewTask | EditTask | TaskAction


def apply(
    session: Session, identity: CurrentIdentity, body: Body, tid: UUID | None, action: str
) -> Task:
    if isinstance(body, NewTask):
        contact = readable_contact(session, identity, body.contact_id)
        if contact.archived_at:
            raise IdentityError("CONTACT_ARCHIVED", 409)
        row = Task(
            id=uuid4(),
            contact_id=contact.id,
            origin_contact_id=contact.id,
            created_by_user_id=identity.user.id,
            version=1,
            schedule_version=1,
            status="open",
            outcome="",
        )
        action = "created"
    else:
        if tid is None:
            raise IdentityError("NOT_FOUND", 404)
        row = authorized(session, identity, tid, write=True)
        if row.version != body.expected_version:
            raise IdentityError("VERSION_CONFLICT", 409)
        if row.status != "open":
            raise IdentityError("TASK_TERMINAL", 409)
        row.version += 1
        if isinstance(body, TaskAction):
            if action not in ("completed", "cancelled"):
                raise IdentityError("VALIDATION_ERROR", 422)
            row.status, row.outcome = action, body.reason
            row.schedule_version += 1
        elif (row.due_at, row.owner_user_id) != (body.due_at, body.owner_user_id):
            row.schedule_version += 1
    if isinstance(body, (NewTask, EditTask)):
        check_context(session, row, body)
        for name in ("title", "notes", "due_at", "owner_user_id", "deal_id", "property_id"):
            setattr(row, name, getattr(body, name))
    row.updated_by_user_id, row.updated_at = identity.user.id, datetime.now(UTC)
    session.execute(text("SELECT set_config('kay.task_action', :action, true)"), {"action": action})
    session.add(row)
    session.flush()
    synchronize(session, row)
    append_event(session, identity, row, action)
    return row


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    body: Body,
    tid: UUID | None = None,
    action: str = "updated",
) -> dict[str, object]:
    route = f"{type(body).__name__}/{tid or ''}/{action}"
    digest = keyed_digest(
        secret,
        "task-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.expire_all()
        identity = current_identity(session, token)
        if tid:
            authorized(session, identity, tid, write=True)
        else:
            if not isinstance(body, NewTask):
                raise IdentityError("VALIDATION_ERROR", 422)
            contact = readable_contact(session, identity, body.contact_id)
            if contact.archived_at:
                raise IdentityError("CONTACT_ARCHIVED", 409)
        session.execute(
            delete(TaskReceipt).where(
                TaskReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        receipt = session.get(TaskReceipt, (identity.user.id, route, key))
        if receipt:
            authorized(session, identity, receipt.task_id, write=True)
            if receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return receipt.result
        with session.no_autoflush:
            row = apply(session, identity, body, tid, action)
        result: dict[str, object] = {"id": str(row.id), "version": row.version}
        session.add(
            TaskReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                task_id=row.id,
                request_hash=digest,
                result=result,
            )
        )
        session.flush()
        return result
