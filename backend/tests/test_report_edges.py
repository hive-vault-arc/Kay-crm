"""Focused reporting transport, finance, hierarchy, time and snapshot cases."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Event

import pytest
from sqlalchemy import event, insert, text

from app.contacts.history_models import TimelineEvent
from app.finance.contracts import CorrectReceipt, FinanceQuery, Recognize
from app.finance.queries import read as finance_read
from app.identity.sessions import current_identity
from app.main import create_app
from app.reports.contracts import DrillQuery, ExceptionQuery, PeriodQuery
from app.reports.datasets import dataset
from app.reports.queries import dashboard, drill_down, exception_list
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import setup
from tests.test_finance import create, execute, fixture, receipt
from tests.test_foundation import client_for
from tests.test_ownership import change, intent
from tests.test_reports import PERIOD, metrics
from tests.test_reservations import project_fixture

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
def test_one_metric_statement_preserves_populated_scoped_drill_parity(settings, database, role):
    _, agent, _, _ = setup(settings, database)
    _, outsider = actor(settings, database)
    create_lead(settings, database, outsider, new_lead("+212600000002"))
    token = agent if role == "agent" else actor(settings, database, role)[1]
    reads = []

    def observe(connection, cursor, statement, parameters, context, many):
        if statement.lstrip().upper().startswith(("SELECT", "WITH")):
            reads.append("report" if "count(" in statement else "identity")

    event.listen(database.engine, "before_cursor_execute", observe)
    try:
        report = dashboard(database, token, PERIOD)
    finally:
        event.remove(database.engine, "before_cursor_execute", observe)
    assert reads == ["identity", "report"]
    contact_metric = next(item for item in report["metrics"] if item["key"] == "contacts")
    assert contact_metric["total"] == (1 if role == "agent" else 2)
    for metric in report["metrics"]:
        detail = drill_down(
            database, token, DrillQuery(metric=metric["key"], **PERIOD.model_dump())
        )
        assert detail["metric"] == metric


def test_collections_decimal_leaf_correction_period_and_reopen_independence(settings, database):
    _, _, _, manager, did = fixture(settings, database)
    commission = create(settings, database, manager, did)
    execute(settings, database, manager, Recognize(expected_version=1), cid=commission)
    execute(settings, database, manager, receipt(2, "2500.01"), cid=commission)
    original = finance_read(database, manager, commission, FinanceQuery(), "receipts")["items"][0]
    assert metrics(database, manager)["collections"]["value"] == "2500.01"
    execute(
        settings,
        database,
        manager,
        CorrectReceipt(
            target="receipt",
            expected_version=3,
            receipt_id=original["id"],
            replacement=receipt(3, "2000.02").model_dump(exclude={"expected_version"}),
            reason="SP17 correction synthétique",
        ),
        cid=commission,
    )
    total = metrics(database, manager)["collections"]
    assert total["total"] == 1 and total["value"] == "2000.02"
    detail = drill_down(database, manager, DrillQuery(metric="collections", **PERIOD.model_dump()))
    assert detail["items"][0]["href"] == f"/deals/{did}?tab=finance"
    assert detail["items"][0]["value"] == "2000.02"
    empty = PeriodQuery(start_on="2020-01-01", end_on="2020-01-31")
    assert metrics(database, manager, empty)["collections"]["value"] == "0.00"


def test_separate_levels_shared_inventory_never_expands_agent_report(settings, database):
    token, _, manager, parent, pid, oid, whole, deals = project_fixture(settings, database)
    _, private = actor(settings, database)
    for who in (token, manager):
        result = metrics(database, who)
        assert result["developments"]["total"] == 1
        assert result["units"]["total"] == 1 and result["standalone"]["total"] == 0
        assert result["property_offerings"]["total"] == 1
        assert result["development_offerings"]["total"] == 1
        for key, expected in (
            ("units", f"/projects/properties/{pid}"),
            ("development_offerings", f"/projects/{parent}"),
        ):
            assert drill_down(database, who, DrillQuery(metric=key))["items"][0]["href"] == expected
    assert all(m["total"] == 0 for m in metrics(database, private).values())
    with database.session() as session:
        now = session.scalar(
            text("SELECT max(availability_confirmed_at)+interval '30 days' FROM offering")
        )
    alerts = exception_list(database, token, ExceptionQuery(), now)
    assert alerts["total"] == 2 and {v["kind"] for v in alerts["items"]} == {
        "property",
        "development",
    }


def test_server_casablanca_bounds_and_index_explain_on_1000_synthetic_actions(settings, database):
    uid, token, contact, _ = setup(settings, database)
    with database.session() as session, session.begin():
        session.execute(
            insert(TimelineEvent),
            [
                {
                    "contact_id": contact,
                    "actor_user_id": uid,
                    "actor_name": "SP17 synthétique",
                    "action": "call",
                    "body": "",
                    "reason": "",
                    "occurred_at": datetime(2025, 12, 31, 23, 30, tzinfo=UTC),
                }
                for _ in range(1000)
            ],
        )
    january = PeriodQuery(start_on="2026-01-01", end_on="2026-01-01")
    assert metrics(database, token, january)["activities"]["total"] == 1000
    page = drill_down(
        database, token, DrillQuery(metric="activities", page_size=100, **january.model_dump())
    )
    assert page["total"] == 1000 and len(page["items"]) == 100 and page["has_next"]
    with database.session() as session:
        identity = current_identity(session, token)
        statement = dataset(identity, "activities", january, datetime.now(UTC))
        compiled = statement.compile(
            dialect=session.bind.dialect, compile_kwargs={"literal_binds": True}
        )
        plan = session.execute(
            text("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + str(compiled))
        ).scalar()
        assert plan[0]["Plan"]["Actual Rows"] == 1000
        print(
            "SP17 EXPLAIN synthetic1000:",
            plan[0]["Plan"]["Node Type"],
            "execution_ms",
            plan[0]["Execution Time"],
        )


def test_repeatable_snapshot_transfer_on_separate_connection_then_revoked_scope(settings, database):
    _, token, contact, _ = setup(settings, database)
    uid, _ = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    waiting, release = Event(), Event()
    triggered = False

    def pause(connection, cursor, statement, parameters, context, many):
        nonlocal triggered
        if not triggered and "count(" in statement and "FROM contact" in statement:
            triggered = True
            waiting.set()
            assert release.wait(10)

    event.listen(database.engine, "before_cursor_execute", pause)
    try:
        with ThreadPoolExecutor(1) as pool:
            future = pool.submit(dashboard, database, token, PERIOD)
            assert waiting.wait(10)
            change(settings, database, manager, contact, intent("assign", primary_agent_id=uid))
            release.set()
            first = {m["key"]: m for m in future.result(timeout=10)["metrics"]}
        assert first["contacts"]["total"] == 1 and first["enquiries"]["total"] == 1
    finally:
        release.set()
        event.remove(database.engine, "before_cursor_execute", pause)
    assert all(m["total"] == 0 for m in metrics(database, token).values())


@pytest.mark.anyio
async def test_reports_strict_transport_current_roles_and_no_store(settings, database):
    _, manager = actor(settings, database, "manager")
    _, admin = actor(settings, database, "administrator")
    proof = {
        "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
        "X-Kay-Session": manager,
    }
    async with client_for(create_app(settings)) as client:
        path = "/api/v1/reports/dashboard"
        assert (await client.get(path)).status_code == 403
        assert (
            await client.get(path, headers={"X-Kay-Facade-Secret": proof["X-Kay-Facade-Secret"]})
        ).status_code == 401
        for query in (
            "role=manager",
            "start_on=2026-01-01",
            "end_on=bad",
            "start_on=2026-01-01&start_on=2026-01-02",
            "now=2026-01-01",
            "page=1",
        ):
            assert (await client.get(f"{path}?{query}", headers=proof)).status_code == 422
        for route in ("dashboard", "activities", "exceptions", "drill-down?metric=contacts"):
            response = await client.get(f"/api/v1/reports/{route}", headers=proof)
            assert response.status_code == 200 and response.headers["cache-control"] == "no-store"
        baseline = (await client.get(path, headers=proof)).json()["metrics"]
        assert (await client.get(path, headers=proof | {"X-Kay-Session": admin})).json()[
            "metrics"
        ] == baseline
        assert (await client.post(path, headers=proof, json={})).status_code == 405
