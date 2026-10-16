"""Reviewed SP-05 → SP-06 data/backfill compatibility on the isolated target only."""

import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select, text

from app.contacts.history_models import TimelineEvent
from app.contacts.models import ContactPhone, Enquiry, IdempotencyRecord
from app.db.session import Database
from app.settings import Settings
from tests.identity_support import create_actor
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("disabled", [False, True])
def test_backfill_true_actor_origin_and_legacy_retry_snapshot(
    settings: Settings, database: Database, disabled: bool
) -> None:
    uid, _, _ = create_actor(settings, database, role="agent")
    contact, enquiry, audit, key = (uuid4() for _ in range(4))
    occurred = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
    assert migrate("downgrade", "0004_contacts_enquiries").returncode == 0
    try:
        with database.engine.begin() as connection:
            connection.execute(
                text("""INSERT INTO contact
              (id,name,type,primary_agent_id,created_by_user_id,source,version)
              VALUES(:cid,'SP06 migration synthétique','person',:uid,:uid,'manual',1)"""),
                {"cid": contact, "uid": uid},
            )
            connection.execute(
                text("""INSERT INTO contact_phone
              (id,contact_id,normalized,label,is_primary,created_by_user_id)
              VALUES(:id,:cid,'+212600000001','',true,:uid)"""),
                {"id": uuid4(), "cid": contact, "uid": uid},
            )
            connection.execute(
                text("""INSERT INTO enquiry
              (id,contact_id,message,source,assigned_agent_id,created_by_user_id,status,version)
              VALUES(:eid,:cid,'SP06 demande synthétique','manual',:uid,:uid,'new',1)"""),
                {"eid": enquiry, "cid": contact, "uid": uid},
            )
            connection.execute(
                text("""INSERT INTO audit_event
              (id,actor_user_id,contact_id,enquiry_id,action,deployment_version,created_at)
              VALUES(:id,:uid,:cid,:eid,'enquiries.created','0.1.0',:occurred)"""),
                {"id": audit, "uid": uid, "cid": contact, "eid": enquiry, "occurred": occurred},
            )
            for route, result in (
                ("enquiries", {"id": str(enquiry), "contact": {"id": str(contact)}}),
                ("contacts", {"id": str(contact), "phones": []}),
            ):
                connection.execute(
                    text("""INSERT INTO idempotency_record
                  (actor_id,route,key,request_hash,contact_id,response)
                  VALUES(:uid,:route,:key,:digest,:cid,CAST(:result AS jsonb))"""),
                    {
                        "uid": uid,
                        "route": route,
                        "key": key,
                        "digest": b"x" * 32,
                        "cid": contact,
                        "result": json.dumps(result),
                    },
                )
        if disabled:
            with database.engine.begin() as connection:
                connection.execute(
                    text("UPDATE \"user\" SET state='disabled' WHERE id=:uid"), {"uid": uid}
                )
        assert migrate("upgrade", "head").returncode == 0
        with database.session() as session:
            history = session.get(TimelineEvent, audit)
            assert history and history.actor_user_id == uid and history.occurred_at == occurred
            assert history.enquiry_id == enquiry and history.contact_id == contact
            assert session.get(Enquiry, enquiry).origin_contact_id == contact  # type: ignore[union-attr]
            assert session.get(Enquiry, enquiry).assigned_agent_id == uid  # type: ignore[union-attr]
            assert session.scalar(select(ContactPhone.origin_contact_id)) == contact
            enquiry_receipt = session.get(IdempotencyRecord, (uid, "enquiries", key))
            contact_receipt = session.get(IdempotencyRecord, (uid, "contacts", key))
            assert enquiry_receipt and enquiry_receipt.response["origin_contact_id"] == str(contact)
            assert contact_receipt and contact_receipt.response["collaborators"] == []
            assert contact_receipt.response["archived_at"] is None
        refused = migrate("downgrade", "0004_contacts_enquiries")
        assert refused.returncode != 0 and "BUSINESS_HISTORY_DOWNGRADE_REFUSED" in refused.stderr
    finally:
        assert migrate("upgrade", "head").returncode == 0
