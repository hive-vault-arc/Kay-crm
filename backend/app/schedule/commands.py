"""Policy-row serialization makes previews advisory and bookings authoritative."""

import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.contacts.access import readable_contact
from app.db.session import Database
from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, keyed_digest
from app.identity.sessions import CurrentIdentity, current_identity, require_role
from app.schedule.contracts import (
    EditVisit,
    FinishVisit,
    NewVisit,
    PolicySave,
    VisitAction,
    VisitFields,
)
from app.schedule.models import SchedulePolicy, ScheduleReceipt, Visit, VisitParticipant
from app.schedule.policy import save
from app.schedule.records import append_event, authorized, check_context, participants
from app.schedule.rules import ACTIVE, hard_error, policy_view
from app.work.reminders import synchronize

Body = NewVisit | EditVisit | VisitAction | FinishVisit | PolicySave


def overlaps(session: Session, row: Visit, participant_ids: list[UUID]) -> bool:
    return (
        session.scalar(
            select(Visit.id)
            .join(VisitParticipant)
            .where(
                Visit.id != row.id,
                Visit.status.in_(ACTIVE),
                Visit.start_at < row.end_at,
                Visit.end_at > row.start_at,
                VisitParticipant.user_id.in_(participant_ids),
            )
            .limit(1)
        )
        is not None
    )


def booking_check(session: Session, row: Visit, fields: VisitFields) -> None:
    if row.status not in ACTIVE:
        return
    error = hard_error(session, row, policy_view(session), row.id)
    if error:
        raise IdentityError(error, 409)
    if overlaps(session, row, fields.participant_ids) and not fields.overlap_reason:
        raise IdentityError("VISIT_OVERLAP_REASON_REQUIRED", 409)


def fields_from_row(session: Session, row: Visit, reason: str) -> VisitFields:
    return VisitFields.model_validate(
        {
            name: getattr(row, name)
            for name in (
                "title",
                "type",
                "location",
                "start_at",
                "end_at",
                "deal_id",
                "property_id",
            )
        }
        | {"participant_ids": participants(session, row.id), "overlap_reason": reason}
    )


def apply_visit(
    session: Session, identity: CurrentIdentity, body: Body, vid: UUID | None, action: str
) -> Visit:
    fields: VisitFields
    original_schedule = None
    if isinstance(body, PolicySave):
        raise RuntimeError("VISIT_BODY_REQUIRED")
    if isinstance(body, NewVisit):
        contact = readable_contact(session, identity, body.contact_id)
        row = Visit(
            id=uuid4(),
            contact_id=contact.id,
            origin_contact_id=contact.id,
            organizer_user_id=identity.user.id,
            status=body.status,
            version=1,
            updated_by_user_id=identity.user.id,
            policy_version=1,
            schedule_version=1,
            outcome="",
        )
        fields, action = body, "created"
    else:
        if vid is None:
            raise IdentityError("NOT_FOUND", 404)
        row = authorized(session, identity, vid, write=True)
        original_schedule = (row.start_at, row.end_at, row.status)
        if row.version != body.expected_version:
            raise IdentityError("VERSION_CONFLICT", 409)
        if row.status in ("completed", "cancelled"):
            raise IdentityError("VISIT_TERMINAL", 409)
        row.version += 1
        fields = (
            body
            if isinstance(body, EditVisit)
            else fields_from_row(
                session, row, body.reason if action == "confirmed" else row.overlap_reason
            )
        )
        if action == "confirmed":
            if row.status == "confirmed":
                raise IdentityError("VISIT_STATE_UNCHANGED", 409)
            row.status = "confirmed"
        elif action in ("completed", "cancelled"):
            if not isinstance(body, FinishVisit) or (
                action == "completed" and row.status not in ACTIVE
            ):
                raise IdentityError("INVALID_STATE", 422)
            row.status, row.outcome = action, body.reason
    check_context(session, identity, row, fields)
    for name in (
        "title",
        "type",
        "location",
        "start_at",
        "end_at",
        "deal_id",
        "property_id",
        "overlap_reason",
    ):
        setattr(row, name, getattr(fields, name))
    if original_schedule is not None and original_schedule != (
        row.start_at,
        row.end_at,
        row.status,
    ):
        row.schedule_version += 1
    booking_check(session, row, fields)
    row.updated_by_user_id, row.updated_at = identity.user.id, datetime.now(UTC)
    row.policy_version = int(str(policy_view(session)["version"]))
    session.execute(
        text("SELECT set_config('kay.visit_action', :action, true)"), {"action": action}
    )
    session.add(row)
    session.flush()
    session.execute(delete(VisitParticipant).where(VisitParticipant.visit_id == row.id))
    session.add_all(
        VisitParticipant(visit_id=row.id, user_id=uid) for uid in fields.participant_ids
    )
    session.flush()
    synchronize(session, row)
    append_event(
        session,
        identity,
        row,
        action,
        body.reason if isinstance(body, VisitAction) else fields.overlap_reason,
    )
    return row


def command(
    database: Database,
    token: str,
    secret: str,
    key: UUID,
    body: Body,
    vid: UUID | None = None,
    action: str = "updated",
) -> dict[str, object]:
    route = f"{type(body).__name__}/{vid or ''}/{action}"
    digest = keyed_digest(
        secret,
        "visit-command",
        json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":")),
    )
    with database.session() as session, session.begin():
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        identity = current_identity(session, token)
        session.scalar(select(User).where(User.id == identity.user.id).with_for_update())
        session.scalar(
            select(SchedulePolicy).where(SchedulePolicy.agency_id == AGENCY_ID).with_for_update()
        )
        session.expire_all()
        identity = current_identity(session, token)
        if isinstance(body, PolicySave):
            require_role(identity, {"administrator"})
        elif isinstance(body, NewVisit):
            contact = readable_contact(session, identity, body.contact_id)
            if contact.archived_at:
                raise IdentityError("CONTACT_ARCHIVED", 409)
        elif vid:
            authorized(session, identity, vid, write=True)
        session.execute(
            delete(ScheduleReceipt).where(
                ScheduleReceipt.created_at < datetime.now(UTC) - timedelta(hours=24)
            )
        )
        receipt = session.get(ScheduleReceipt, (identity.user.id, route, key))
        if receipt:
            if receipt.visit_id:
                authorized(session, identity, receipt.visit_id, write=True)
            if receipt.request_hash != digest:
                raise IdentityError("IDEMPOTENCY_CONFLICT", 409)
            return receipt.result
        if isinstance(body, PolicySave):
            with session.no_autoflush:
                result, row = save(session, identity, body, secret), None
        else:
            with session.no_autoflush:
                row = apply_visit(session, identity, body, vid, action)
            result = {"id": str(row.id), "version": row.version}
        session.add(
            ScheduleReceipt(
                actor_id=identity.user.id,
                route=route,
                key=key,
                request_hash=digest,
                visit_id=row.id if row else None,
                result=result,
            )
        )
        session.flush()
        return result
