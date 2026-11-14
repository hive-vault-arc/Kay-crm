"""Deliver annual birthday reminders using current contact assignments."""

from datetime import UTC, date, datetime, time, timedelta
from uuid import uuid4

from sqlalchemy import ColumnElement, SQLColumnExpression, and_, extract, literal, or_, select
from sqlalchemy.dialects.postgresql import insert

from app.contacts.models import Contact
from app.db.session import Database
from app.files.models import Notification
from app.identity.models import AGENCY_ID, Agency, Credential, User
from app.schedule.rules import ZONE

BIRTHDAY_EVE = "contact.birthday.eve"
BIRTHDAY_TODAY = "contact.birthday.today"
BIRTHDAY_HOUR = time(9)
BATCH_SIZE = 50


def birthday_at(day: date) -> datetime:
    return datetime.combine(day, BIRTHDAY_HOUR, ZONE)


def birthday_matches(
    occurrence: SQLColumnExpression[date] | SQLColumnExpression[date | None],
) -> ColumnElement[bool]:
    month, day = extract("month", occurrence), extract("day", occurrence)
    birth_month, birth_day = (
        extract("month", Contact.birth_date),
        extract("day", Contact.birth_date),
    )
    return and_(
        birth_month == month,
        or_(
            birth_day == day,
            # The day after February 28 is March 1 only in a non-leap year.
            and_(month == 2, day == 28, extract("day", occurrence + 1) == 1, birth_day == 29),
        ),
    )


def deliver_birthdays(database: Database, clock: datetime) -> int:
    """Recompute the due window each run, committing delivery and dedupe together."""
    local_day = clock.astimezone(ZONE).date()
    tomorrow = local_day + timedelta(days=1)
    scheduled = (
        (BIRTHDAY_EVE, tomorrow, birthday_at(tomorrow).astimezone(UTC) - timedelta(hours=24)),
        (BIRTHDAY_TODAY, local_day, birthday_at(local_day)),
    )
    due_stages = [(kind, day) for kind, day, due in scheduled if clock >= due]
    if not due_stages:
        return 0
    delivered = 0
    with database.session() as session, session.begin():
        # Match the lock order used by contact, assignment and staff changes.
        if not session.scalar(
            select(Agency.id).where(Agency.id == AGENCY_ID).with_for_update(skip_locked=True)
        ):
            return 0
        for kind, day in due_stages:
            occurrence = literal(day)
            # The lock and unique event key keep concurrent workers and retries idempotent.
            pending = session.execute(
                select(Contact.id, Contact.primary_agent_id)
                .join(User, User.id == Contact.primary_agent_id)
                .join(Credential, Credential.user_id == User.id)
                .where(
                    Contact.type == "person",
                    Contact.archived_at.is_(None),
                    Contact.birth_date.is_not(None),
                    birthday_matches(occurrence),
                    User.state == "active",
                    User.deleted_at.is_(None),
                    Credential.must_change_password.is_(False),
                    Credential.temporary_expires_at.is_(None),
                    ~select(Notification.id)
                    .where(
                        Notification.contact_id == Contact.id,
                        Notification.user_id == Contact.primary_agent_id,
                        Notification.birthday_on == day,
                        Notification.kind == kind,
                    )
                    .exists(),
                )
                .order_by(Contact.id)
                .limit(BATCH_SIZE)
            ).all()
            for contact_id, uid in pending:
                session.execute(
                    insert(Notification)
                    .values(
                        id=uuid4(),
                        user_id=uid,
                        event_key=f"{kind}:{contact_id}:{day:%Y%m%d}",
                        kind=kind,
                        contact_id=contact_id,
                        birthday_on=day,
                        created_at=clock,
                    )
                    .on_conflict_do_nothing(index_elements=["user_id", "event_key"])
                )
            delivered += len(pending)
    return delivered
