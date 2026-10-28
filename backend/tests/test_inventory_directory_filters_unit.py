"""Exact SQL predicates and stubbed routing only; database connections forbidden."""

from contextlib import contextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.identity.router import facade_authority, session_proof
from app.identity.security import IdentityError
from app.inventory import hierarchy_queries, hierarchy_router, queries, router
from app.inventory.contracts import DevelopmentQuery, InventoryQuery, PropertiesQuery
from app.inventory.directory_filters import directory_filters
from app.inventory.hierarchy_models import Development
from app.inventory.models import Property


def sql(statement):
    return str(
        statement.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True})
    )


@pytest.mark.parametrize("development", [False, True])
def test_prices_and_campaign_state_bind_one_exact_target_and_one_offer(development):
    query = InventoryQuery(
        offering_kind="rental",
        state="available",
        min_comparison_mad="9007199254740993.41",
        max_comparison_mad="9007199254740993.42",
    )
    model = Development if development else Property
    statement = sql(select(model.id).where(*directory_filters(query, development=development)))
    target = "development" if development else "property"
    assert statement.count("EXISTS") == 1
    assert f"offering.{target}_id = {target}.id" in statement
    assert "9007199254740993.41" in statement and "9007199254740993.42" in statement
    assert "offering.kind = 'rental'" in statement and "offering.state = 'available'" in statement
    assert "offering.is_current" in statement
    assert "offering.price_period = 'month'" in statement and "THEN 12 ELSE 1" in statement
    assert "offering.kind = 'sale'" in statement and "ELSE NULL" not in statement
    assert "contact" not in statement and "owner" not in statement and "JOIN" not in statement
    if development:
        assert "property" not in statement


def test_dimensions_do_not_require_an_offer_without_a_price_or_campaign_filter():
    query = InventoryQuery(state="all", min_area_sqm="94.25", min_rooms=3)
    statement = sql(select(Property.id).where(*directory_filters(query)))
    assert "property.area_sqm >= 94.25" in statement and "property.rooms >= 3" in statement
    assert "EXISTS" not in statement and "offering" not in statement
    assert not directory_filters(InventoryQuery())
    priced = sql(
        select(Property.id).where(*directory_filters(InventoryQuery(min_comparison_mad="0.01")))
    )
    assert "EXISTS" in priced and "offering.is_current" in priced


def test_existing_withdrawn_campaign_semantics_survive_the_new_price_predicate():
    statement = sql(
        select(Property.id).where(
            *directory_filters(InventoryQuery(state="withdrawn", max_comparison_mad="1.25"))
        )
    )
    assert "offering.state = 'withdrawn'" in statement and "offering.is_current" not in statement


def routing(monkeypatch):
    calls = []
    app = FastAPI()
    app.include_router(router.router)
    app.include_router(hierarchy_router.router)
    app.dependency_overrides[facade_authority] = lambda: None
    app.dependency_overrides[session_proof] = lambda: "synthetic-proof"

    @app.exception_handler(IdentityError)
    async def identity_error(_, error):
        return JSONResponse({"error": {"code": error.code}}, status_code=error.status)

    monkeypatch.setattr(router, "database", lambda _: None)
    monkeypatch.setattr(hierarchy_router, "database", lambda _: None)

    def read_list(database, token, kind, query):
        calls.append((kind, query))
        return {"accepted": True}

    def read_hierarchy(database, token, operation, target, query):
        calls.append((operation, query))
        return {"accepted": True}

    monkeypatch.setattr(router, "read_list", read_list)
    monkeypatch.setattr(hierarchy_router, "read_hierarchy", read_hierarchy)
    return app, calls


@pytest.mark.parametrize(
    "path", ["properties", "developments", f"developments/{uuid4()}/inventory"]
)
def test_existing_routes_accept_exact_price_ranges_and_bound_dimensions_only_on_physical_lists(
    monkeypatch, path
):
    app, calls = routing(monkeypatch)
    with TestClient(app) as client:
        query = "min_comparison_mad=9007199254740993.41&max_comparison_mad=9007199254740993.42"
        if path != "developments":
            query += "&min_area_sqm=94.25&min_rooms=3"
        assert client.get(f"/api/v1/{path}?{query}").status_code == 200
        assert calls[0][1].min_comparison_mad == "9007199254740993.41"
        assert calls[0][1].max_comparison_mad == "9007199254740993.42"
        for invalid in [
            "min_comparison_mad=-1",
            "min_comparison_mad=1&max_comparison_mad=0.99",
            "max_comparison_mad=1.001",
            "min_rooms=1001",
            "min_area_sqm=0",
            "min_rooms=1.5",
            "min_comparison_mad=1&min_comparison_mad=2",
            "private_owner=1",
        ]:
            assert client.get(f"/api/v1/{path}?{invalid}").status_code == 422
        if path == "developments":
            assert client.get("/api/v1/developments?min_area_sqm=10").status_code == 422
            assert client.get("/api/v1/developments?min_rooms=2").status_code == 422
    assert len(calls) == 1


def read_setup(monkeypatch, *, denied=False):
    statements = []

    class Session:
        def execute(self, statement):
            statements.append(statement)
            return []

        def scalar(self, statement):
            statements.append(statement)
            return 0

        def scalars(self, statement):
            statements.append(statement)
            return SimpleNamespace(all=lambda: [])

    @contextmanager
    def session():
        yield Session()

    def identity(*_):
        assert len(statements) == 1 and str(statements[0]).startswith("SET TRANSACTION")
        if denied:
            raise IdentityError("FORBIDDEN", 403)
        return SimpleNamespace(user=SimpleNamespace(role="agent"))

    for module in [queries, hierarchy_queries]:
        monkeypatch.setattr(module, "current_identity", identity)
    monkeypatch.setattr(queries, "properties_view", lambda *_: [])
    monkeypatch.setattr(hierarchy_queries, "properties_view", lambda *_: [])
    monkeypatch.setattr(
        hierarchy_queries, "summary", lambda session, rows: [{"id": str(uuid4())} for _ in rows]
    )
    monkeypatch.setattr(
        hierarchy_queries, "development_record", lambda *_: SimpleNamespace(archived_at=None)
    )
    return SimpleNamespace(session=session), statements


@pytest.mark.parametrize("kind", ["properties", "developments", "inventory"])
def test_actual_read_paths_apply_the_same_range_before_every_count_facet_and_page(
    monkeypatch, kind
):
    database, statements = read_setup(monkeypatch)
    fields = {
        "min_comparison_mad": "100.01",
        "max_comparison_mad": "200.02",
        "min_area_sqm": "20.25",
        "min_rooms": 2,
        "state": "all",
        "page_size": 20,
    }
    if kind == "properties":
        result = queries.read_list(database, "synthetic", kind, PropertiesQuery(**fields))
    else:
        result = hierarchy_queries.read_hierarchy(
            database,
            "synthetic",
            kind,
            uuid4() if kind == "inventory" else None,
            (DevelopmentQuery if kind == "developments" else InventoryQuery)(**fields),
        )
    assert result["total"] == 0 and result["items"] == []
    compiled = [sql(statement) for statement in statements[1:]]
    assert len(compiled) == (3 if kind == "properties" else 2)
    for statement in compiled:
        assert "100.01" in statement and "200.02" in statement
        assert statement.count("EXISTS") == 1
        if kind != "developments":
            assert "20.25" in statement and "property.rooms >= 2" in statement
    if kind == "properties":
        assert "GROUP BY property.category" in compiled[0]


@pytest.mark.parametrize("kind", ["properties", "developments", "inventory"])
def test_current_identity_denial_precedes_any_directory_count_or_stock_projection(
    monkeypatch, kind
):
    database, statements = read_setup(monkeypatch, denied=True)
    with pytest.raises(IdentityError, match="^FORBIDDEN$"):
        if kind == "properties":
            queries.read_list(database, "synthetic", kind, PropertiesQuery(min_rooms=2))
        else:
            hierarchy_queries.read_hierarchy(database, "synthetic", kind, uuid4(), InventoryQuery())
    assert len(statements) == 1
