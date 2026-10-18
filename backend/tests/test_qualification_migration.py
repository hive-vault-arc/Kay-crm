"""An additive upgrade retains pre-qualification client, enquiry and deal history."""

from uuid import uuid4

import pytest
from sqlalchemy import text

from tests.contact_support import actor
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]
SNAPSHOTS = {
    "contact": text("SELECT to_jsonb(row) FROM contact row"),
    "enquiry": text("SELECT to_jsonb(row) FROM enquiry row"),
    "deal": text("SELECT to_jsonb(row) FROM deal row"),
    "deal_stage_event": text("SELECT to_jsonb(row) FROM deal_stage_event row"),
}


def test_populated_qualification_upgrade_preserves_legacy_records(settings, database):
    uid, _ = actor(settings, database)
    cid, eid, did = uuid4(), uuid4(), uuid4()
    assert migrate("downgrade", "0022_website_intake").returncode == 0
    try:
        with database.engine.begin() as connection:
            params = {"uid": uid, "cid": cid, "eid": eid, "did": did, "id": uuid4()}
            connection.execute(
                text(
                    "INSERT INTO contact (id,name,type,primary_agent_id,"
                    "created_by_user_id,source,version) VALUES "
                    "(:cid,'Client synthétique historique',"
                    "'person',:uid,:uid,'manual',1)"
                ),
                params,
            )
            connection.execute(
                text(
                    "INSERT INTO contact_phone (id,contact_id,origin_contact_id,"
                    "normalized,label,is_primary,created_by_user_id) VALUES "
                    "(:id,:cid,:cid,'+212600000001','',true,:uid)"
                ),
                params,
            )
            connection.execute(
                text(
                    "INSERT INTO enquiry (id,contact_id,origin_contact_id,message,"
                    "source,assigned_agent_id,created_by_user_id,status,version) VALUES "
                    "(:eid,:cid,:cid,'Message historique synthétique','manual',:uid,:uid,'new',1)"
                ),
                params,
            )
            connection.execute(
                text(
                    "INSERT INTO deal (id,contact_id,origin_contact_id,enquiry_id,"
                    "title,created_by_user_id,updated_by_user_id) VALUES "
                    "(:did,:cid,:cid,:eid,'Affaire historique synthétique',:uid,:uid)"
                ),
                params,
            )
            connection.execute(
                text(
                    "INSERT INTO deal_stage_event (id,deal_id,contact_id,actor_user_id,"
                    "actor_name,action,to_stage,before_version,after_version,title,next_action) "
                    "VALUES "
                    "(:id,:did,:cid,:uid,'Agent synthétique','created','new',0,1,"
                    "'Affaire historique synthétique','')"
                ),
                {**params, "id": uuid4()},
            )
        with database.engine.connect() as connection:
            before = {table: connection.scalar(statement) for table, statement in SNAPSHOTS.items()}
        assert migrate("upgrade", "head").returncode == 0
        assert migrate("check").returncode == 0
        with database.engine.connect() as connection:
            for table, previous in before.items():
                current = connection.scalar(SNAPSHOTS[table])
                assert all(current[key] == value for key, value in previous.items())
            assert connection.scalar(text("SELECT languages FROM contact")) == []
            assert connection.scalar(text("SELECT initial_budget FROM deal")) is None
            assert connection.scalar(text("SELECT qualification FROM deal_stage_event")) == {}
        refused = migrate("downgrade", "0022_website_intake")
        assert (
            refused.returncode != 0 and "QUALIFICATION_HISTORY_DOWNGRADE_REFUSED" in refused.stderr
        )
    finally:
        assert migrate("upgrade", "head").returncode == 0
