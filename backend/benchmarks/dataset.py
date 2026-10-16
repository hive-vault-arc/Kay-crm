"""Fixed full-volume synthetic dataset with no arbitrary target or reset option."""

import json
import secrets
from datetime import UTC, datetime
from uuid import UUID

from alembic.config import Config
from sqlalchemy import func, insert, select, text

from alembic import command
from app.db.isolation import assert_isolated, resolve_identity
from app.db.session import Base, Database
from app.identity.models import AGENCY_ID, Credential, User
from app.identity.security import hash_password
from app.recovery.private import crypt, guard, protect_directory
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings

ROOT = BACKEND_ROOT / ".local-data" / "benchmark"
CONTEXT = b"kay-sp22-benchmark-v1"


def identity(kind: str, number: int) -> UUID:
    import hashlib

    return UUID(hashlib.md5(f"sp22:{kind}:{number}".encode(), usedforsecurity=False).hexdigest())


def populate(connection, admin: UUID) -> None:
    common = {"actor": admin}
    for first in range(1, 200001, 5000):
        connection.info["seed_phase"] = f"contacts_{first}"
        values = {**common, "first": first, "last": first + 4999}
        connection.execute(
            text("""INSERT INTO contact
            (id,name,type,primary_agent_id,created_by_user_id,source,version)
            SELECT md5('sp22:contact:'||n)::uuid,'SP22 contact synthétique '||n,'person',
            md5('sp22:user:'||(10+(n-1)%90))::uuid,:actor,'manual',1
            FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
            values,
        )
        connection.execute(
            text("""INSERT INTO contact_phone
            (id,contact_id,origin_contact_id,normalized,label,is_primary,created_by_user_id)
            SELECT md5('sp22:phone:'||n)::uuid,md5('sp22:contact:'||n)::uuid,
            md5('sp22:contact:'||n)::uuid,'+2126'||lpad((10000000+n)::text,8,'0'),
            'Synthétique',true,:actor
            FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
            values,
        )
        connection.execute(
            text("""INSERT INTO contact_role(contact_id,role)
            SELECT md5('sp22:contact:'||n)::uuid,
            CASE WHEN n<=20000 THEN 'owner' ELSE 'buyer' END
            FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
            values,
        )
        connection.execute(
            text("""INSERT INTO enquiry
            (id,contact_id,origin_contact_id,message,source,assigned_agent_id,
            created_by_user_id,status,version)
            SELECT md5('sp22:enquiry:'||n)::uuid,md5('sp22:contact:'||n)::uuid,
            md5('sp22:contact:'||n)::uuid,'Demande synthétique SP22','manual',
            md5('sp22:user:'||(10+(n-1)%90))::uuid,:actor,'new',1
            FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
            values,
        )
        connection.execute(
            text("""INSERT INTO timeline_event
            (id,contact_id,actor_user_id,actor_name,action,body,reason)
            SELECT md5('sp22:history:'||n)::uuid,md5('sp22:contact:'||n)::uuid,:actor,
            'SP22 administrateur synthétique','contacts.created',
            'Fixture de charge synthétique',''
            FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
            values,
        )
        for table in ("contact", "contact_phone", "contact_role", "enquiry", "timeline_event"):
            connection.exec_driver_sql("ANALYZE " + table)
        connection.exec_driver_sql("SET CONSTRAINTS ALL IMMEDIATE")
        connection.exec_driver_sql("SET CONSTRAINTS ALL DEFERRED")
        if first % 50000 == 1:
            print(f"SP22_SEED_CONTACTS validated={first + 4999}", flush=True)
    connection.execute(
        text("""INSERT INTO development
        (id,reference,name,category,created_by_user_id)
        SELECT md5('sp22:development:'||n)::uuid,'SP22-D-'||n,
        'Programme synthétique SP22 '||n,'mixed',:actor FROM generate_series(1,200) n"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO block(id,development_id,code,label)
        SELECT md5('sp22:block:'||n)::uuid,md5('sp22:development:'||n)::uuid,
        'B1','Bloc synthétique' FROM generate_series(1,200) n""")
    )
    connection.execute(
        text("""INSERT INTO floor(id,block_id,code,label,display_order)
        SELECT md5('sp22:floor:'||d||':'||f)::uuid,md5('sp22:block:'||d)::uuid,
        'F'||f,'Étage synthétique '||f,f FROM generate_series(1,200) d
        CROSS JOIN generate_series(1,4) f""")
    )
    connection.execute(
        text("""INSERT INTO unit_type
        (id,development_id,code,label,category,default_area_sqm,default_rooms)
        SELECT md5('sp22:type:'||d||':'||t)::uuid,md5('sp22:development:'||d)::uuid,
        'T'||t,'Type synthétique '||t,'apartment',60+20*t,t
        FROM generate_series(1,200) d CROSS JOIN generate_series(1,3) t""")
    )
    for first in range(1, 20001, 500):
        connection.info["seed_phase"] = f"inventory_{first}"
        populate_inventory(connection, {**common, "first": first, "last": first + 499})
        for table in ("property", "property_owner", "offering", "deal", "deal_stage_event"):
            connection.exec_driver_sql("ANALYZE " + table)
        connection.exec_driver_sql("SET CONSTRAINTS ALL IMMEDIATE")
        connection.exec_driver_sql("SET CONSTRAINTS ALL DEFERRED")
        if first % 5000 == 1:
            print(f"SP22_SEED_INVENTORY validated={first + 499}", flush=True)
    connection.execute(
        text("""INSERT INTO offering
        (id,development_id,kind,price_mad,currency,conditions,created_by_user_id)
        SELECT md5('sp22:whole:'||n)::uuid,md5('sp22:development:'||n)::uuid,
        'sale',100000000+n,'MAD','Campagne entière synthétique',:actor
        FROM generate_series(1,200) n"""),
        common,
    )


def populate_inventory(connection, common) -> None:
    connection.execute(
        text("""INSERT INTO property
        (id,reference,category,marketing_name,location,area_sqm,development_id,
        floor_id,unit_type_id,rooms,created_by_user_id)
        SELECT md5('sp22:property:'||n)::uuid,'SP22-P-'||lpad(n::text,5,'0'),
        CASE WHEN n<=16000 AND n%5=0 THEN 'land' WHEN n<=16000 THEN 'apartment'
          ELSE (ARRAY['villa','house','apartment','land'])[1+(n%4)] END,
        'Bien synthétique SP22 '||n,'Localisation synthétique',80+(n%5)*10,
        CASE WHEN n<=16000 THEN md5('sp22:development:'||d)::uuid END,
        CASE WHEN n<=16000 AND n%5<>0 THEN md5('sp22:floor:'||d||':'||(1+n%(1+d%4)))::uuid END,
        CASE WHEN n<=16000 AND n%5<>0 THEN md5('sp22:type:'||d||':'||(1+n%3))::uuid END,
        2,:actor FROM (SELECT n,CASE WHEN n<=800 THEN 1+(n-1)/20
          WHEN n<=3200 THEN 41+(n-801)/60 ELSE 81+(n-3201)/160 END d
          FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n) v"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO property_owner
        (id,property_id,contact_id,origin_contact_id,created_by_user_id)
        SELECT md5('sp22:owner:'||n)::uuid,md5('sp22:property:'||n)::uuid,
        md5('sp22:contact:'||n)::uuid,md5('sp22:contact:'||n)::uuid,:actor
        FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO offering
        (id,property_id,kind,price_mad,currency,price_period,conditions,state,
        is_current,availability_confirmed_at,created_by_user_id)
        SELECT md5('sp22:offering:'||n)::uuid,md5('sp22:property:'||n)::uuid,
        'sale',1000000+n,'MAD',NULL,'Conditions synthétiques','available',true,
        now(),:actor
        FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO deal
        (id,contact_id,origin_contact_id,enquiry_id,offering_id,title,stage,
        next_action,created_by_user_id,updated_by_user_id)
        SELECT md5('sp22:deal:'||n)::uuid,md5('sp22:contact:'||n)::uuid,
        md5('sp22:contact:'||n)::uuid,md5('sp22:enquiry:'||n)::uuid,
        md5('sp22:offering:'||n)::uuid,'Affaire synthétique SP22 '||n,'new',
        'Suivi synthétique',:actor,:actor
        FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO deal_stage_event
        (id,deal_id,contact_id,actor_user_id,actor_name,action,to_stage,
        before_version,after_version,title,next_action,offering_id,reason)
        SELECT md5('sp22:deal-event:'||n)::uuid,md5('sp22:deal:'||n)::uuid,
        md5('sp22:contact:'||n)::uuid,:actor,'SP22 administrateur synthétique',
        'created','new',0,1,'Affaire synthétique SP22 '||n,'Suivi synthétique',
        md5('sp22:offering:'||n)::uuid,'Fixture synthétique'
        FROM generate_series(CAST(:first AS integer),CAST(:last AS integer)) n"""),
        common,
    )
    connection.execute(
        text("""INSERT INTO offering
        (id,property_id,kind,price_mad,currency,price_period,conditions,state,
        is_current,availability_confirmed_at,created_by_user_id)
        SELECT md5('sp22:rental:'||n)::uuid,md5('sp22:property:'||n)::uuid,
        'rental',10000+n,'MAD',CASE WHEN n%4=0 THEN 'year' ELSE 'month' END,
        'Conditions synthétiques','available',true,now(),:actor
        FROM generate_series(CAST(:first AS integer)+1,CAST(:last AS integer),2) n"""),
        common,
    )


def main() -> None:
    require_venv()
    settings = load_settings()
    if settings.app_environment != "benchmark":
        raise SystemExit("BENCHMARK_ENVIRONMENT_REQUIRED")
    target = assert_isolated(settings)
    protect_directory(ROOT)
    credentials = ROOT / "credentials.dpapi"
    guard(credentials, ROOT)
    if credentials.exists():
        raise SystemExit("BENCHMARK_ALREADY_PREPARED")
    command.upgrade(Config(str(BACKEND_ROOT / "alembic.ini")), "head")
    database = Database(settings.selected_database_url())
    actors = []
    seed_info = {}
    try:
        with database.engine.begin() as connection:
            seed_info = connection.info
            connection.exec_driver_sql("SET LOCAL statement_timeout='120s'")
            if connection.scalar(text('SELECT count(*) FROM "user"')) or connection.scalar(
                text("SELECT count(*) FROM contact")
            ):
                raise RuntimeError("NONEMPTY_BENCHMARK_REFUSED")
            if resolve_identity(database.engine) != target:
                raise RuntimeError("BENCHMARK_IDENTITY_CHANGED")
            for n in range(100):
                password = secrets.token_urlsafe(24)
                role = "administrator" if n == 0 else "manager" if n < 10 else "agent"
                actor = {"id": identity("user", n), "email": f"sp22-{n}@example.com", "role": role}
                connection.execute(
                    insert(User),
                    {
                        **actor,
                        "agency_id": AGENCY_ID,
                        "display_name": f"SP22 {role} synthétique {n}",
                        "state": "active",
                        "version": 1,
                    },
                )
                connection.execute(
                    insert(Credential),
                    {
                        "user_id": actor["id"],
                        "password_hash": hash_password(password),
                        "must_change_password": False,
                        "temporary_expires_at": None,
                        "version": 1,
                    },
                )
                actors.append(
                    {
                        **actor,
                        "id": str(actor["id"]),
                        "password": password,
                        "contact_id": str(identity("contact", 1 if n < 10 else n - 9)),
                    }
                )
            connection.execute(text("UPDATE agency SET bootstrap_completed_at=now()"))
            populate(connection, identity("user", 0))
        with credentials.open("xb") as stream:
            stream.write(crypt(json.dumps(actors).encode(), CONTEXT, encrypt=True))
        with database.engine.connect().execution_options(
            isolation_level="AUTOCOMMIT"
        ) as connection:
            connection.exec_driver_sql("SET statement_timeout='120s'")
            connection.exec_driver_sql("ANALYZE")
        counts = {}
        with database.engine.connect() as connection:
            for name in (
                "user",
                "contact",
                "enquiry",
                "property",
                "development",
                "block",
                "floor",
                "unit_type",
                "deal",
            ):
                counts[name] = connection.scalar(
                    select(func.count()).select_from(Base.metadata.tables[name])
                )
        print(
            json.dumps(
                {
                    "database_oid": target.oid,
                    "counts": counts,
                    "created_at": datetime.now(UTC).isoformat(),
                    "synthetic_only": True,
                }
            )
        )
    except Exception as failure:
        original = getattr(failure, "orig", None)
        diagnostic = getattr(original, "diag", None)
        constraint = getattr(diagnostic, "constraint_name", None)
        message = getattr(diagnostic, "message_primary", None)
        import re

        code = (
            constraint
            if constraint and re.fullmatch(r"[a-z0-9_]{1,100}", constraint)
            else message
            if message and re.fullmatch(r"[A-Z0-9_]{1,100}", message)
            else type(original or failure).__name__
        )
        phase = seed_info.get("seed_phase", "accounts")
        raise SystemExit(f"BENCHMARK_PREPARATION_FAILED: {code} phase={phase}") from None
    finally:
        database.close()


if __name__ == "__main__":
    main()
