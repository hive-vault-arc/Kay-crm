"""Bounded synthetic PostgreSQL plans, not the SP-22 volume benchmark."""

import json

import pytest
from sqlalchemy import text

from tests.contact_support import actor

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_measured_scope_and_audit_indexes(settings, database):
    uid, _ = actor(settings, database)
    other, _ = actor(settings, database)
    third, _ = actor(settings, database)
    with database.engine.connect() as connection:
        transaction = connection.begin()
        try:
            connection.execute(text("SET LOCAL statement_timeout='15s'"))
            connection.execute(
                text(
                    "INSERT INTO "
                    "contact(id,name,type,primary_agent_id,created_by_user_id,source,version) "
                    "SELECT gen_random_uuid(),'SP19 plan '||n,'person',:other,:other,'manual',1 "
                    "FROM generate_series(1,4000) n"
                ),
                {"other": other},
            )
            connection.execute(
                text(
                    "INSERT INTO contact_collaborator(contact_id,user_id) "
                    "SELECT id,CASE WHEN row_number() OVER (ORDER BY id)<=40 THEN CAST(:uid AS "
                    "uuid) "
                    "ELSE CAST(:third AS uuid) END FROM contact WHERE primary_agent_id=:other"
                ),
                {"uid": uid, "other": other, "third": third},
            )
            connection.execute(
                text(
                    "INSERT INTO "
                    "audit_event(id,actor_user_id,action,deployment_version,created_at) "
                    "SELECT gen_random_uuid(),:uid,'identity.login','sp19-plan',now()-n*interval "
                    "'1 second' "
                    "FROM generate_series(1,4000) n"
                ),
                {"uid": uid},
            )
            for table in ("contact", "contact_collaborator", "audit_event"):
                connection.execute(text("ANALYZE " + table))
            queries = {
                "scope": (
                    "SELECT id FROM contact WHERE archived_at IS NULL "
                    "AND (primary_agent_id=:uid OR id IN (SELECT contact_id FROM "
                    "contact_collaborator "
                    "WHERE user_id=:uid AND revoked_at IS NULL)) "
                    "AND name ILIKE '%SP19%' ORDER BY lower(name),id LIMIT 25",
                    {"uid": uid},
                ),
                "audit": (
                    "SELECT id,action FROM audit_event ORDER BY created_at DESC,id LIMIT 25",
                    {},
                ),
            }

            def plans():
                return {
                    name: connection.execute(
                        text("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql), values
                    ).scalar_one()[0]
                    for name, (sql, values) in queries.items()
                }

            before = plans()
            connection.execute(
                text(
                    "INSERT INTO "
                    "contact_phone(id,origin_contact_id,contact_id,normalized,label,"
                    "is_primary,created_by_user_id) "
                    "SELECT gen_random_uuid(),id,id,'+2127'||lpad("
                    "(row_number() OVER (ORDER BY id))::text,8,'0'),'Synthétique',true,:other "
                    "FROM contact WHERE primary_agent_id=:other"
                ),
                {"other": other},
            )
            connection.execute(text("ANALYZE contact_phone"))
            connection.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_contact_collaborator_active_user ON "
                    "contact_collaborator(user_id,contact_id) WHERE revoked_at IS NULL"
                )
            )
            connection.execute(
                text("CREATE INDEX IF NOT EXISTS ix_audit_page ON audit_event(created_at DESC,id)")
            )
            after = plans()
            assert after["scope"]["Plan"]["Actual Rows"] == 25
            assert "ix_audit_page" in json.dumps(after["audit"])
            print(
                "SP19 bounded plans "
                + json.dumps(
                    {
                        "contacts": 4000,
                        "grants": 4000,
                        "events": 4000,
                        "milliseconds": {
                            name: {
                                "before": before[name]["Execution Time"],
                                "after": after[name]["Execution Time"],
                            }
                            for name in queries
                        },
                        "scope_grants_index": "ix_contact_collaborator_active_user"
                        in json.dumps(after["scope"]),
                        "audit_index": True,
                    }
                )
            )
        finally:
            transaction.rollback()
