"""Repeat unresolved visit reports without reopening historical inbox rows."""

from datetime import datetime, timedelta

from sqlalchemy import ColumnElement, or_, select, tuple_, union
from sqlalchemy.orm import aliased

from app.contacts.models import Contact, ContactCollaborator
from app.db.session import Database
from app.files.models import Notification
from app.identity.models import AGENCY_ID, Agency, Credential, User
from app.schedule.models import Visit, VisitParticipant
from app.schedule.rules import ACTIVE

REPORT = "visit.follow_up"
REPORT_DELAY = timedelta(hours=2)
REPORT_INTERVAL = timedelta(hours=24)


def latest_visit_report() -> ColumnElement[bool]:
    newer = aliased(Notification)
    return or_(
        Notification.kind != REPORT,
        ~select(newer.id)
        .where(
            newer.kind == REPORT,
            newer.visit_id == Notification.visit_id,
            newer.user_id == Notification.user_id,
            newer.schedule_version == Notification.schedule_version,
            tuple_(newer.created_at, newer.id) > tuple_(Notification.created_at, Notification.id),
        )
        .exists(),
    )


def deliver_visit_reports(database: Database, clock: datetime) -> int:
    with database.session() as session, session.begin():
        if not session.scalar(
            select(Agency.id).where(Agency.id == AGENCY_ID).with_for_update(skip_locked=True)
        ):
            return 0
        eligible_visits = (
            select(
                Visit.id,
                Visit.organizer_user_id,
                Visit.schedule_version,
                Visit.end_at,
                Visit.contact_id,
            )
            .where(Visit.status.in_(ACTIVE), Visit.end_at <= clock - REPORT_DELAY)
            .cte()
        )
        recipients = union(
            select(
                eligible_visits.c.id.label("visit_id"),
                eligible_visits.c.organizer_user_id.label("user_id"),
            ),
            select(VisitParticipant.visit_id, VisitParticipant.user_id).join(
                eligible_visits, eligible_visits.c.id == VisitParticipant.visit_id
            ),
        ).subquery()
        pending = session.execute(
            select(eligible_visits.c.id, eligible_visits.c.schedule_version, User.id)
            .select_from(eligible_visits)
            .join(recipients, recipients.c.visit_id == eligible_visits.c.id)
            .join(Contact, Contact.id == eligible_visits.c.contact_id)
            .join(User, User.id == recipients.c.user_id)
            .join(Credential, Credential.user_id == User.id)
            .where(
                Contact.archived_at.is_(None),
                Contact.merged_into_contact_id.is_(None),
                User.state == "active",
                User.deleted_at.is_(None),
                Credential.must_change_password.is_(False),
                Credential.temporary_expires_at.is_(None),
                or_(
                    User.role != "agent",
                    Contact.primary_agent_id == User.id,
                    select(ContactCollaborator.contact_id)
                    .where(
                        ContactCollaborator.contact_id == Contact.id,
                        ContactCollaborator.user_id == User.id,
                        ContactCollaborator.revoked_at.is_(None),
                    )
                    .exists(),
                ),
                ~select(Notification.id)
                .where(
                    Notification.kind == REPORT,
                    Notification.visit_id == eligible_visits.c.id,
                    Notification.schedule_version == eligible_visits.c.schedule_version,
                    Notification.user_id == User.id,
                    Notification.created_at > clock - REPORT_INTERVAL,
                )
                .exists(),
            )
            .order_by(eligible_visits.c.end_at, eligible_visits.c.id, User.id)
            .limit(50)
        ).all()
        for visit_id, schedule_version, user_id in pending:
            session.add(
                Notification(
                    user_id=user_id,
                    kind=REPORT,
                    visit_id=visit_id,
                    schedule_version=schedule_version,
                    event_key=f"{REPORT}:{visit_id}:{schedule_version}:r:{int(clock.timestamp())}",
                    created_at=clock,
                )
            )
        return len(pending)
