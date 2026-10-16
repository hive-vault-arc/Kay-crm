"""Explain current scoped SQL at full volume without publishing SQL or identities."""

import json
from datetime import UTC, datetime

from sqlalchemy import func, select, text

from app.contacts.access import contact_scope
from app.contacts.models import Contact, Enquiry
from app.db.isolation import assert_isolated
from app.db.session import Database
from app.identity.service import login
from app.identity.sessions import current_identity
from app.inventory.models import Property
from app.recovery.private import crypt, guard
from app.reports.contracts import PeriodQuery
from app.reports.datasets import dataset
from app.runtime import require_venv
from app.settings import load_settings
from benchmarks.dataset import CONTEXT, ROOT


def nodes(plan):
    yield plan
    for child in plan.get("Plans", []):
        yield from nodes(child)


def main() -> None:
    require_venv()
    settings = load_settings()
    if settings.app_environment != "benchmark":
        raise SystemExit("BENCHMARK_ENVIRONMENT_REQUIRED")
    identity = assert_isolated(settings)
    credentials = ROOT / "credentials.dpapi"
    guard(credentials, ROOT)
    actors = json.loads(crypt(credentials.read_bytes(), CONTEXT, encrypt=False))
    database = Database(settings.selected_database_url())
    reports = []
    try:
        for position in (0, 10):
            actor = actors[position]
            token, _ = login(
                database,
                settings.facade_secret.get_secret_value(),
                actor["email"],
                actor["password"],
            )
            with database.session() as session:
                session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
                principal = current_identity(session, token)
                scope = select(Contact.id).where(
                    Contact.archived_at.is_(None),
                    Contact.merged_into_contact_id.is_(None),
                    contact_scope(principal),
                )
                statements = {
                    "contact_count": select(func.count()).select_from(scope.subquery()),
                    "contact_page": select(Contact)
                    .where(Contact.id.in_(scope))
                    .order_by(Contact.updated_at.desc(), Contact.id)
                    .limit(25),
                    "enquiry_count": select(func.count())
                    .select_from(Enquiry)
                    .where(Enquiry.contact_id.in_(scope)),
                    "property_page": select(Property)
                    .where(Property.archived_at.is_(None))
                    .order_by(Property.updated_at.desc(), Property.id)
                    .limit(25),
                }
                for metric in ("contacts", "enquiries", "active_deals", "activities", "units"):
                    source = dataset(principal, metric, PeriodQuery(), datetime.now(UTC)).subquery()
                    statements["dashboard_" + metric] = select(func.count()).select_from(source)
                for name, statement in statements.items():
                    compiled = statement.compile(
                        dialect=session.bind.dialect, compile_kwargs={"literal_binds": True}
                    )
                    plan = session.execute(
                        text("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + str(compiled))
                    ).scalar_one()[0]
                    reports.append(
                        {
                            "role": principal.user.role,
                            "query": name,
                            "execution_ms": plan["Execution Time"],
                            "planning_ms": plan["Planning Time"],
                            "rows": plan["Plan"]["Actual Rows"],
                            "nodes": sorted({node["Node Type"] for node in nodes(plan["Plan"])}),
                            "indexes": sorted(
                                {
                                    node["Index Name"]
                                    for node in nodes(plan["Plan"])
                                    if "Index Name" in node
                                }
                            ),
                            "shared_read_blocks": plan["Plan"].get("Shared Read Blocks", 0),
                            "shared_hit_blocks": plan["Plan"].get("Shared Hit Blocks", 0),
                        }
                    )
        result = {"database_oid": identity.oid, "plans": reports}
        path = ROOT / "query-plans.json"
        guard(path, ROOT)
        path.write_text(json.dumps(result, indent=2), encoding="utf8")
        print(json.dumps(result))
    finally:
        database.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as failure:
        raise SystemExit("BENCHMARK_PLAN_FAILED: " + type(failure).__name__) from None
