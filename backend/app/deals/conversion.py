"""Convert an authorized lead atomically without copying its canonical contact."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.contacts.access import ContactConflict, scoped_contact
from app.contacts.history import record
from app.contacts.models import Enquiry
from app.contacts.queries import enquiry_in_scope
from app.deals.contracts import ConvertLead
from app.deals.history import append_event
from app.deals.models import Deal
from app.deals.qualification import client_snapshot, project_interest
from app.identity.security import IdentityError
from app.identity.sessions import CurrentIdentity


def convert(session: Session, identity: CurrentIdentity, eid: UUID, body: ConvertLead) -> Deal:
    session.scalar(select(Enquiry).where(Enquiry.id == eid).with_for_update())
    enquiry = enquiry_in_scope(session, identity, eid)
    contact = scoped_contact(session, identity, enquiry.contact_id)
    if enquiry.version != body.expected_version:
        raise ContactConflict("VERSION_CONFLICT", {"current": {"version": enquiry.version}})
    if session.scalar(
        select(Deal.id)
        .where(Deal.enquiry_id == eid, Deal.stage.not_in(("won", "lost", "cancelled")))
        .limit(1)
    ):
        raise IdentityError("LEAD_ALREADY_CONVERTED", 409)
    did, now = uuid4(), datetime.now(UTC)
    project = project_interest(session, body.project, did, 1)
    snapshot = client_snapshot(session, contact)
    row = Deal(
        id=did,
        contact_id=contact.id,
        origin_contact_id=contact.id,
        enquiry_id=eid,
        title=f"{contact.name} · {project.name}"[:160],
        stage="new",
        version=1,
        initial_budget=body.initial_budget,
        purchase_reasons=list(body.purchase_reasons),
        campaign_source=enquiry.campaign_source,
        rating=enquiry.rating,
        client_snapshot=snapshot,
        notes=enquiry.message,
        next_action="",
        created_by_user_id=identity.user.id,
        updated_by_user_id=identity.user.id,
        updated_at=now,
    )
    session.add(row)
    session.flush()
    session.add(project)
    enquiry.status, enquiry.converted_deal_id, enquiry.converted_at = "converted", did, now
    enquiry.initial_budget = body.initial_budget
    enquiry.version += 1
    enquiry.updated_at = now
    session.flush()
    append_event(session, identity, row, "created", None)
    record(session, identity, contact.id, "enquiries.converted", enquiry_id=eid, deal_id=did)
    session.flush()
    return row
