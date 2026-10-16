"""Database-only effects commit with their job; a killed transaction rolls back."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.contacts.access import has_scope
from app.contacts.history_models import TimelineEvent
from app.contacts.models import Contact, ContactEmail, ContactPhone, Enquiry
from app.db.session import Database
from app.files.models import Job, OutboxEvent
from app.identity.models import AGENCY_ID, Agency, AuditEvent, Credential, User
from app.identity.sessions import credential_active
from app.intake.contracts import Submission
from app.intake.models import WebsiteReceipt, WebsiteSource


def apply(session: Session, source: WebsiteSource, row: WebsiteReceipt) -> None:
    data = Submission.model_validate(row.payload)
    contact = session.scalar(
        select(Contact)
        .join(ContactPhone, ContactPhone.contact_id == Contact.id)
        .where(ContactPhone.normalized == data.phone, ContactPhone.archived_at.is_(None))
    )
    fresh = contact is None
    if contact is None:
        user = session.get(User, source.default_agent_id)
        credential = session.get(Credential, source.default_agent_id)
        if (
            not user
            or not credential
            or user.role != "agent"
            or credential.must_change_password
            or not credential_active(user, credential, datetime.now(UTC))
        ):
            raise ValueError("WEBSITE_ROUTING_UNAVAILABLE")
        contact = Contact(
            id=uuid4(),
            name=data.name,
            type="person",
            primary_agent_id=user.id,
            created_by_user_id=None,
            website_source_id=source.id,
            source="website",
            source_submission_id=row.id,
        )
        session.add(contact)
        session.flush()
        session.add(
            ContactPhone(
                contact_id=contact.id,
                origin_contact_id=contact.id,
                normalized=data.phone,
                label="",
                is_primary=True,
                created_by_user_id=None,
                website_source_id=source.id,
            )
        )
        if data.email:
            session.add(
                ContactEmail(
                    contact_id=contact.id,
                    origin_contact_id=contact.id,
                    normalized=data.email,
                    label="",
                    is_primary=True,
                    created_by_user_id=None,
                    website_source_id=source.id,
                )
            )
    assigned = (
        contact.primary_agent_id
        if contact.archived_at is None and has_scope(session, contact.primary_agent_id, contact)
        else None
    )
    enquiry = Enquiry(
        id=uuid4(),
        contact_id=contact.id,
        origin_contact_id=contact.id,
        message=data.enquiry_message(),
        source="website",
        source_submission_id=row.id,
        website_source_id=source.id,
        created_by_user_id=None,
        assigned_agent_id=assigned,
        received_at=row.received_at,
        status="new",
    )
    session.add(enquiry)
    session.flush()
    for action in ("contacts.created", "enquiries.created") if fresh else ("enquiries.created",):
        session.add(
            TimelineEvent(
                contact_id=contact.id,
                actor_user_id=None,
                website_source_id=source.id,
                actor_name="Source web : " + source.name[:140],
                action=action,
                body="",
                reason="",
                enquiry_id=enquiry.id,
            )
        )
        session.add(
            AuditEvent(
                actor_user_id=None,
                website_source_id=source.id,
                action=action,
                contact_id=contact.id,
                enquiry_id=enquiry.id,
            )
        )
    row.state, row.enquiry_id, row.processed_at = "processed", enquiry.id, datetime.now(UTC)


def run_once(database: Database) -> bool:
    with database.session() as session, session.begin():
        # Same lock order as staff identity/ownership/manual-phone commands.
        session.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        clock = datetime.now(UTC)
        for event in session.scalars(
            select(OutboxEvent)
            .where(
                OutboxEvent.kind == "website.process",
                ~select(Job.id).where(Job.outbox_id == OutboxEvent.id).exists(),
            )
            .order_by(OutboxEvent.created_at, OutboxEvent.id)
            .limit(50)
            .with_for_update(skip_locked=True)
        ):
            session.add(Job(outbox_id=event.id, state="ready", attempts=0, available_at=clock))
        session.flush()
        job = session.scalar(
            select(Job)
            .join(OutboxEvent, OutboxEvent.id == Job.outbox_id)
            .where(
                OutboxEvent.kind == "website.process",
                Job.state.in_(["ready", "retry"]),
                Job.available_at <= clock,
                Job.attempts < 5,
            )
            .order_by(Job.available_at, Job.id)
            .limit(1)
            .with_for_update(of=Job, skip_locked=True)
        )
        if job is None:
            return False
        job_event = session.get(OutboxEvent, job.outbox_id)
        row = session.get(WebsiteReceipt, job_event.website_receipt_id) if job_event else None
        if row is None:
            raise RuntimeError("OUTBOX_INTEGRITY_ERROR")
        job.attempts += 1
        if row.state != "queued":
            job.state = "done" if row.state == "processed" else "failed"
            return True
        source = session.get(WebsiteSource, row.source_id)
        if source is None or not source.active:
            row.state, job.state, job.error_code = "failed", "invalidated", "SOURCE_DISABLED"
            return True
        try:
            with session.begin_nested():
                apply(session, source, row)
                session.flush()
        except ValueError, SQLAlchemyError:
            job.state = "failed" if job.attempts >= 5 else "retry"
            job.error_code = "WEBSITE_ROUTING_UNAVAILABLE"
            job.available_at = clock + timedelta(seconds=min(300, 2**job.attempts))
            if job.state == "failed":
                row.state = "failed"
        else:
            job.state, job.error_code = "done", None
        return True
