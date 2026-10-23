"""Test-only accounts; refuse the development target before any fixture write."""

import secrets
from datetime import UTC, datetime, timedelta
from time import monotonic, sleep
from uuid import UUID, uuid4

from sqlalchemy import delete, or_, select, text, update
from sqlalchemy.orm import Session

from app.contacts.history_models import AssignmentEvent, TimelineEvent
from app.contacts.models import (
    Contact,
    ContactCollaborator,
    ContactEmail,
    ContactPhone,
    ContactRole,
    Enquiry,
    IdempotencyRecord,
)
from app.db.isolation import assert_isolated
from app.db.session import Database
from app.deals.history_models import DealStageEvent
from app.deals.models import CustomerOffer, Deal, DealReceipt
from app.deals.outcome_models import DealOutcome, DealReopening
from app.deals.project_models import DealProject
from app.discovery.models import ExportJob
from app.files.models import (
    Document,
    DocumentVersion,
    FilePermit,
    FileReceipt,
    Job,
    Notification,
    OutboxEvent,
)
from app.finance.models import Commission, CommissionRevision, FinanceReceipt, Receipt
from app.identity.models import (
    AGENCY_ID,
    Agency,
    AuditEvent,
    Credential,
    LoginRateBucket,
    StaffSession,
    User,
    UserCommandReceipt,
)
from app.identity.security import hash_password
from app.imports.models import ImportBatch, ImportPreview, ImportRow
from app.intake.models import WebsiteReceipt, WebsiteSource
from app.inventory.hierarchy_models import Block, Development, DevelopmentOwner, Floor, UnitType
from app.inventory.models import InventoryEvent, InventoryReceipt, Offering, Property, PropertyOwner
from app.inventory.outcome_models import StockEffect, StockOutcome, StockReversal
from app.inventory.reservation_models import Reservation
from app.realtime.models import PushDelivery, PushSubscription, RealtimePresence, RealtimeTicket
from app.project_links.models import ProjectLink
from app.requirements.models import (
    Requirement,
    RequirementCriterion,
    RequirementReceipt,
    ShortlistEntry,
)
from app.schedule.models import (
    BreakWindow,
    ScheduleEvent,
    SchedulePolicy,
    ScheduleReceipt,
    Visit,
    VisitEvent,
    VisitParticipant,
    WorkingWindow,
)
from app.settings import Settings
from app.work.models import Task, TaskEvent, TaskReceipt
from tests.deal_cleanup import actor_deal_ids, delete_actor_deals
from tests.file_cleanup import delete_actor_files
from tests.finance_cleanup import delete_actor_finance
from tests.requirement_cleanup import delete_actor_requirements
from tests.schedule_cleanup import delete_actor_visits
from tests.work_cleanup import delete_actor_tasks


def observe_two_lock_waiters(database: Database, table: str) -> None:
    """Prove both real transactions reached the held lock, not merely two threads."""
    deadline = monotonic() + 1.5
    while monotonic() < deadline:
        with database.session() as session:
            waiting = session.scalar(
                text(
                    "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                    "AND wait_event_type='Lock' AND query LIKE '%FOR UPDATE%' "
                    "AND query LIKE :table_pattern"
                ),
                {"table_pattern": f"%{table}%"},
            )
        if waiting == 2:
            return
        sleep(0.01)
    raise AssertionError("TWO_REAL_POSTGRESQL_LOCK_WAITERS_REQUIRED")


def clear_identity(settings: Settings, database: Database) -> None:
    assert_isolated(settings)
    with database.session() as session, session.begin():
        emails = session.scalars(select(User.email)).all()
        if any(
            not email.startswith("sp03-") or not email.endswith("@example.com") for email in emails
        ):
            raise RuntimeError("NON_SYNTHETIC_TEST_ACCOUNT_REFUSED")
        session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
        session.execute(
            update(Enquiry)
            .where(Enquiry.converted_deal_id.is_not(None))
            .values(converted_deal_id=None, converted_at=None, status="closed")
        )
        session.execute(
            update(SchedulePolicy).values(
                version=1, company_car_capacity_per_hour=2, updated_by_user_id=None
            )
        )
        for model in (
            PushDelivery,
            PushSubscription,
            RealtimePresence,
            RealtimeTicket,
            ImportPreview,
            ImportRow,
            ImportBatch,
            FinanceReceipt,
            CommissionRevision,
            Receipt,
            Commission,
            Notification,
            Job,
            OutboxEvent,
            WebsiteReceipt,
            ExportJob,
            TaskReceipt,
            TaskEvent,
            Task,
            ScheduleReceipt,
            VisitEvent,
            VisitParticipant,
            Visit,
            ScheduleEvent,
            BreakWindow,
            WorkingWindow,
            FileReceipt,
            FilePermit,
            DocumentVersion,
            Document,
            AuditEvent,
            TimelineEvent,
            DealReceipt,
            StockReversal,
            StockEffect,
            StockOutcome,
            DealReopening,
            DealOutcome,
            Reservation,
            DealStageEvent,
            CustomerOffer,
            DealProject,
            ProjectLink,
            Deal,
            RequirementReceipt,
            ShortlistEntry,
            RequirementCriterion,
            Requirement,
            UserCommandReceipt,
            StaffSession,
            InventoryReceipt,
            InventoryEvent,
            Offering,
            PropertyOwner,
            Property,
            DevelopmentOwner,
            UnitType,
            Floor,
            Block,
            Development,
            IdempotencyRecord,
            AssignmentEvent,
            Enquiry,
            ContactCollaborator,
            ContactRole,
            ContactPhone,
            ContactEmail,
            Contact,
            WebsiteSource,
            Credential,
            User,
            LoginRateBucket,
        ):
            session.execute(delete(model))
        session.execute(
            update(Agency).where(Agency.id == AGENCY_ID).values(bootstrap_completed_at=None)
        )
        session.execute(
            update(SchedulePolicy).values(
                version=1, company_car_capacity_per_hour=2, updated_by_user_id=None
            )
        )


def delete_actor_business(session: Session, user_id: UUID) -> None:
    """Called only after the private fixture validates its isolated synthetic actor."""
    sessions = select(StaffSession.id).where(StaffSession.user_id == user_id)
    session.execute(delete(PushDelivery).where(PushDelivery.session_id.in_(sessions)))
    session.execute(delete(PushSubscription).where(PushSubscription.session_id.in_(sessions)))
    session.execute(delete(RealtimePresence).where(RealtimePresence.session_id.in_(sessions)))
    session.execute(delete(RealtimeTicket).where(RealtimeTicket.session_id.in_(sessions)))
    contacts = list(
        session.scalars(
            select(Contact.id).where(
                or_(Contact.created_by_user_id == user_id, Contact.primary_agent_id == user_id)
            )
        )
    )
    # A synthetic merged family is one fixture; retain no dangling original FKs.
    connected = set(contacts)
    while True:
        expanded = connected | set(
            session.scalars(select(Contact.id).where(Contact.merged_into_contact_id.in_(connected)))
        )
        expanded |= {
            cid
            for cid in session.scalars(
                select(Contact.merged_into_contact_id).where(Contact.id.in_(connected))
            )
            if cid
        }
        for model in (ContactPhone, ContactEmail, Enquiry, Document, Requirement, Deal, Visit):
            expanded |= set(
                session.scalars(
                    select(model.contact_id).where(model.origin_contact_id.in_(connected))
                )
            )
            expanded |= set(
                session.scalars(
                    select(model.origin_contact_id).where(model.contact_id.in_(connected))
                )
            )
        if expanded == connected:
            break
        connected = expanded
    contacts = list(connected)
    developments = list(
        session.scalars(
            select(Development.id).where(
                or_(
                    Development.created_by_user_id == user_id,
                    Development.developer_contact_id.in_(contacts),
                    select(DevelopmentOwner.id)
                    .where(
                        DevelopmentOwner.development_id == Development.id,
                        or_(
                            DevelopmentOwner.contact_id.in_(contacts),
                            DevelopmentOwner.origin_contact_id.in_(contacts),
                        ),
                    )
                    .exists(),
                )
            )
        )
    )
    properties = list(
        session.scalars(
            select(Property.id).where(
                or_(
                    Property.development_id.in_(developments),
                    Property.created_by_user_id == user_id,
                    select(PropertyOwner.id)
                    .where(
                        PropertyOwner.property_id == Property.id,
                        or_(
                            PropertyOwner.contact_id.in_(contacts),
                            PropertyOwner.origin_contact_id.in_(contacts),
                        ),
                    )
                    .exists(),
                )
            )
        )
    )
    session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
    session.execute(
        delete(ProjectLink).where(
            or_(
                ProjectLink.enquiry_id.in_(
                    select(Enquiry.id).where(Enquiry.contact_id.in_(contacts))
                ),
                ProjectLink.deal_id.in_(
                    actor_deal_ids(session, user_id, contacts, properties, developments)
                ),
                ProjectLink.property_id.in_(properties),
                ProjectLink.development_id.in_(developments),
                ProjectLink.created_by_user_id == user_id,
                ProjectLink.removed_by_user_id == user_id,
            )
        )
    )
    export_ids = select(ExportJob.id).where(ExportJob.author_user_id == user_id)
    export_events = select(OutboxEvent.id).where(OutboxEvent.export_id.in_(export_ids))
    session.execute(delete(Job).where(Job.outbox_id.in_(export_events)))
    session.execute(delete(OutboxEvent).where(OutboxEvent.export_id.in_(export_ids)))
    session.execute(delete(ExportJob).where(ExportJob.author_user_id == user_id))
    batches = select(ImportBatch.id).where(
        or_(
            ImportBatch.author_user_id == user_id,
            ImportBatch.approved_by_user_id == user_id,
            select(ImportRow.batch_id)
            .where(
                ImportRow.batch_id == ImportBatch.id,
                or_(
                    ImportRow.contact_id.in_(contacts),
                    ImportRow.agent_id == user_id,
                    ImportRow.override_agent_id == user_id,
                ),
            )
            .exists(),
        )
    )
    batch_ids = list(session.scalars(batches))
    session.execute(delete(ImportPreview).where(ImportPreview.batch_id.in_(batch_ids)))
    session.execute(delete(ImportRow).where(ImportRow.batch_id.in_(batch_ids)))
    session.execute(delete(ImportBatch).where(ImportBatch.id.in_(batch_ids)))
    delete_actor_finance(
        session, user_id, actor_deal_ids(session, user_id, contacts, properties, developments)
    )
    delete_actor_tasks(session, user_id, contacts)
    delete_actor_visits(session, user_id, contacts)
    delete_actor_files(session, user_id, contacts, developments, properties)
    delete_actor_deals(session, user_id, contacts, properties, developments)
    delete_actor_requirements(session, user_id, contacts, properties, developments)
    session.execute(
        delete(InventoryReceipt).where(
            or_(
                InventoryReceipt.actor_id == user_id,
                InventoryReceipt.property_id.in_(properties),
                InventoryReceipt.development_id.in_(developments),
            )
        )
    )
    session.execute(
        delete(AuditEvent).where(
            or_(
                AuditEvent.property_id.in_(properties),
                AuditEvent.development_id.in_(developments),
                AuditEvent.actor_user_id == user_id,
            )
        )
    )
    session.execute(
        delete(InventoryEvent).where(
            or_(
                InventoryEvent.property_id.in_(properties),
                InventoryEvent.development_id.in_(developments),
                InventoryEvent.actor_user_id == user_id,
            )
        )
    )
    session.execute(
        delete(Offering).where(
            or_(Offering.property_id.in_(properties), Offering.development_id.in_(developments))
        )
    )
    session.execute(delete(PropertyOwner).where(PropertyOwner.property_id.in_(properties)))
    session.execute(delete(Property).where(Property.id.in_(properties)))
    session.execute(
        delete(DevelopmentOwner).where(DevelopmentOwner.development_id.in_(developments))
    )
    session.execute(delete(UnitType).where(UnitType.development_id.in_(developments)))
    session.execute(
        delete(Floor).where(
            Floor.block_id.in_(select(Block.id).where(Block.development_id.in_(developments)))
        )
    )
    session.execute(delete(Block).where(Block.development_id.in_(developments)))
    session.execute(delete(Development).where(Development.id.in_(developments)))
    enquiries = list(
        session.scalars(
            select(Enquiry.id).where(
                or_(Enquiry.created_by_user_id == user_id, Enquiry.contact_id.in_(contacts))
            )
        )
    )
    session.execute(text("SET LOCAL kay.synthetic_cleanup='on'"))
    session.execute(
        delete(TimelineEvent).where(
            or_(
                TimelineEvent.actor_user_id == user_id,
                TimelineEvent.contact_id.in_(contacts),
                TimelineEvent.related_contact_id.in_(contacts),
                TimelineEvent.enquiry_id.in_(enquiries),
            )
        )
    )
    session.execute(
        delete(AssignmentEvent).where(
            or_(
                AssignmentEvent.actor_user_id == user_id,
                AssignmentEvent.previous_user_id == user_id,
                AssignmentEvent.new_user_id == user_id,
                AssignmentEvent.contact_id.in_(contacts),
                AssignmentEvent.enquiry_id.in_(enquiries),
            )
        )
    )
    session.execute(
        delete(IdempotencyRecord).where(
            or_(IdempotencyRecord.actor_id == user_id, IdempotencyRecord.contact_id.in_(contacts))
        )
    )
    session.execute(
        delete(AuditEvent).where(
            or_(
                AuditEvent.actor_user_id == user_id,
                AuditEvent.target_user_id == user_id,
                AuditEvent.contact_id.in_(contacts),
                AuditEvent.enquiry_id.in_(enquiries),
            )
        )
    )
    session.execute(delete(Enquiry).where(Enquiry.id.in_(enquiries)))
    session.execute(
        delete(ContactCollaborator).where(
            or_(
                ContactCollaborator.contact_id.in_(contacts), ContactCollaborator.user_id == user_id
            )
        )
    )
    for model in (ContactRole, ContactPhone, ContactEmail):
        session.execute(delete(model).where(model.contact_id.in_(contacts)))
    session.execute(delete(Contact).where(Contact.id.in_(contacts)))


def create_actor(
    settings: Settings,
    database: Database,
    *,
    role: str = "administrator",
    restricted: bool = False,
    state: str = "active",
) -> tuple[UUID, str, str]:
    assert_isolated(settings)
    user_id = uuid4()
    email = f"sp03-{user_id.hex}@example.com"
    password = secrets.token_urlsafe(24)
    with database.session() as session, session.begin():
        session.add(
            User(
                id=user_id,
                agency_id=AGENCY_ID,
                display_name="Compte synthétique de contrôle",
                email=email,
                role=role,
                state=state,
            )
        )
        session.flush()
        session.add(
            Credential(
                user_id=user_id,
                password_hash=hash_password(password),
                must_change_password=restricted,
                temporary_expires_at=datetime.now(UTC) + timedelta(hours=24)
                if restricted
                else None,
                handoff_confirmed_at=datetime.now(UTC)
                if restricted and state == "active"
                else None,
            )
        )
    return user_id, email, password
