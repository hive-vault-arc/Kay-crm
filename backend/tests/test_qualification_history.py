"""Ordinary SQL cannot detach qualification or project interests from deal history."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, select, text, update
from sqlalchemy.exc import IntegrityError

from app.deals.history_models import DealStageEvent
from app.deals.models import Deal
from app.deals.project_models import DealProject
from app.deals.queries import read_detail
from tests.deal_support import edit, new, run, setup
from tests.test_isolation_migrations import migrate

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_additive_qualification_history_migration_matches_metadata(settings, database):
    assert migrate("upgrade", "head").returncode == 0
    assert migrate("check").returncode == 0


@pytest.mark.parametrize(
    "field,value",
    [
        ("initial_budget", "2.00 MAD"),
        ("campaign_source", "instagram_ads"),
        ("rating", "hot"),
        ("purchase_reasons", ["investment"]),
        ("client_snapshot", {"name": "Sans histoire"}),
        ("notes", "Sans histoire"),
        ("payment_method", "cash"),
        ("number_of_rooms", 9),
    ],
)
def test_ordinary_sql_qualification_update_requires_matching_snapshot(
    settings,
    database,
    field,
    value,
):
    _, token, contact, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(contact))["id"])
    before = read_detail(database, token, did)
    with pytest.raises(IntegrityError, match="DEAL_QUALIFICATION_HISTORY_REQUIRED"):
        with database.session() as session, session.begin():
            session.execute(update(Deal).where(Deal.id == did).values({field: value}))
    assert read_detail(database, token, did) == before


@pytest.mark.parametrize("operation", ["rename", "remove", "append"])
def test_project_mutation_cannot_reuse_unchanged_history(settings, database, operation):
    _, token, contact, _ = setup(settings, database)
    did = UUID(run(settings, database, token, new(contact))["id"])
    with pytest.raises(IntegrityError, match="DEAL_QUALIFICATION_HISTORY_REQUIRED"):
        with database.session() as session, session.begin():
            if operation == "rename":
                session.execute(
                    update(DealProject)
                    .where(DealProject.deal_id == did)
                    .values(
                        name="Autre nom sans histoire",
                    )
                )
            elif operation == "remove":
                session.execute(delete(DealProject).where(DealProject.deal_id == did))
            else:
                session.add(
                    DealProject(deal_id=did, position=2, external_name="Autre", name="Autre")
                )


def test_insert_cannot_hide_unqualified_deal_behind_empty_legacy_snapshot(settings, database):
    actor, token, contact, _ = setup(settings, database)
    did = uuid4()
    with pytest.raises(IntegrityError, match="DEAL_QUALIFICATION_REQUIRED"):
        with database.session() as session, session.begin():
            session.add(
                Deal(
                    id=did,
                    contact_id=contact,
                    origin_contact_id=contact,
                    title="Ancien contournement",
                    created_by_user_id=actor,
                    updated_by_user_id=actor,
                )
            )
            session.flush()
            session.add(
                DealStageEvent(
                    deal_id=did,
                    contact_id=contact,
                    actor_user_id=actor,
                    actor_name="Synthétique",
                    action="created",
                    to_stage="new",
                    before_version=0,
                    after_version=1,
                    title="Ancien contournement",
                    next_action="",
                    qualification={},
                )
            )


def test_project_reorder_and_qualified_edit_have_one_exact_new_snapshot(settings, database):
    _, token, contact, _ = setup(settings, database)
    projects = [{"external_name": "Principal"}, {"external_name": "Alternative"}]
    did = UUID(run(settings, database, token, new(contact, projects=projects))["id"])
    run(settings, database, token, edit(projects=list(reversed(projects))), did)
    current = read_detail(database, token, did)
    assert [project["name"] for project in current["projects"]] == ["Alternative", "Principal"]
    with database.session() as session:
        rows = session.scalars(
            select(DealStageEvent)
            .where(DealStageEvent.deal_id == did)
            .order_by(DealStageEvent.after_version)
        ).all()
        assert rows[0].qualification["projects"][0]["name"] == "Principal"
        assert rows[1].qualification["projects"] == current["projects"]
        assert session.scalar(text("SELECT count(*) FROM deal_project")) == 2
