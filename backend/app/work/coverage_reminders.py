"""Durable unseen-note reminders use the agency's current work windows."""

from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import ColumnElement, Select, and_, func, or_, select, tuple_
from sqlalchemy.orm import aliased

from app.contacts.models import Contact, Enquiry
from app.db.session import Database
from app.deals.models import Deal
from app.files.models import Notification
from app.identity.models import AGENCY_ID, Agency, Credential, User
from app.schedule.models import BreakWindow, WorkingWindow
from app.schedule.rules import ZONE
from app.work.coverage import NOTE_KIND
from app.work.coverage_models import CoverageNote


def active_dossiers() -> Select[UUID, UUID, UUID]:
    return (
        select(CoverageNote.id, CoverageNote.author_user_id, Contact.primary_agent_id)
        .select_from(CoverageNote)
        .outerjoin(Enquiry, Enquiry.id == CoverageNote.enquiry_id)
        .outerjoin(Deal, Deal.id == CoverageNote.deal_id)
        .join(Contact, Contact.id == func.coalesce(Enquiry.contact_id, Deal.contact_id))
        .where(
            Contact.archived_at.is_(None),
            Contact.merged_into_contact_id.is_(None),
            or_(
                and_(
                    Enquiry.id.is_not(None),
                    Enquiry.archived_at.is_(None),
                    Enquiry.assigned_agent_id.is_not(None),
                ),
                and_(Deal.id.is_not(None), Deal.archived_at.is_(None)),
            ),
        )
    )


def inbox_scope(*, latest: bool = True) -> ColumnElement[bool]:
    newer = aliased(Notification)
    active = active_dossiers().subquery()
    allowed = and_(
        Notification.kind == NOTE_KIND,
        select(active.c.id)
        .where(
            active.c.id == Notification.coverage_note_id,
            active.c.primary_agent_id == Notification.user_id,
        )
        .exists(),
    )
    if not latest:
        return allowed
    return and_(
        allowed,
        ~select(newer.id)
        .where(
            newer.coverage_note_id == Notification.coverage_note_id,
            newer.user_id == Notification.user_id,
            tuple_(newer.created_at, newer.id) > tuple_(Notification.created_at, Notification.id),
        )
        .exists(),
    )


def deliver_coverage(database: Database, clock: datetime) -> int:
    local = clock.astimezone(ZONE)
    weekday, current = local.isoweekday(), local.time()
    with database.session() as session, session.begin():
        if not session.scalar(
            select(Agency.id).where(Agency.id == AGENCY_ID).with_for_update(skip_locked=True)
        ):
            return 0
        working = session.scalar(
            select(
                select(WorkingWindow.policy_id)
                .where(
                    WorkingWindow.policy_id == AGENCY_ID,
                    WorkingWindow.weekday == weekday,
                    WorkingWindow.start_local <= current,
                    WorkingWindow.end_local > current,
                )
                .exists()
                & ~select(BreakWindow.policy_id)
                .where(
                    BreakWindow.policy_id == AGENCY_ID,
                    BreakWindow.weekday == weekday,
                    BreakWindow.start_local <= current,
                    BreakWindow.end_local > current,
                )
                .exists()
            )
        )
        if not working:
            return 0
        pending = session.execute(
            active_dossiers()
            .join(User, User.id == Contact.primary_agent_id)
            .join(Credential, Credential.user_id == User.id)
            .where(
                CoverageNote.seen_at.is_(None),
                CoverageNote.created_at <= clock,
                CoverageNote.author_user_id != User.id,
                User.role == "agent",
                User.state == "active",
                User.deleted_at.is_(None),
                Credential.must_change_password.is_(False),
                Credential.temporary_expires_at.is_(None),
                ~select(Notification.id)
                .where(
                    Notification.coverage_note_id == CoverageNote.id,
                    Notification.user_id == User.id,
                    Notification.created_at > clock - timedelta(hours=4),
                )
                .exists(),
            )
            .order_by(CoverageNote.created_at, CoverageNote.id)
            .limit(50)
        ).all()
        for note_id, _author_id, user_id in pending:
            session.add(
                Notification(
                    kind=NOTE_KIND,
                    coverage_note_id=note_id,
                    user_id=user_id,
                    event_key=f"{NOTE_KIND}:{note_id}:{clock.isoformat()}",
                    created_at=clock,
                )
            )
        return len(pending)
