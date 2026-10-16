"""SP-11 transfer/merge provenance, private deal documents and additive migration evidence."""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, text

from app.contacts.ownership import mutate
from app.contacts.queries import read_detail as contact_read
from app.deals.contracts import ChildQuery, DealQuery
from app.deals.queries import read_children, read_detail, read_list
from app.files.service import list_documents, read_document
from app.files.worker import run_once
from app.identity.security import IdentityError
from app.main import create_app
from app.requirements.contracts import NewRequirement
from tests.contact_support import actor, create_lead, new_lead
from tests.deal_support import edit, new, offer, run, setup
from tests.file_support import grant, image_bytes, new_document
from tests.test_files import headers
from tests.test_foundation import client_for
from tests.test_inventory import offering_draft, property_draft
from tests.test_isolation_migrations import migrate
from tests.test_ownership import change, cid, confirmation, intent
from tests.test_requirements import run as requirement_command


@pytest.mark.parametrize("kind", ["sale", "rental"])
@pytest.mark.parametrize("context", ["offering", "proposal", "uncommitted"])
def test_research_intent_change_checks_linked_deal_without_blanket_lock(
    settings, database, kind, context
):
    from app.requirements.contracts import EditRequirement
    from app.requirements.models import RequirementReceipt
    from app.requirements.queries import read_detail as requirement_read

    _, token, contact, _ = setup(settings, database)
    original = NewRequirement(
        contact_id=contact,
        title="Recherche liée synthétique",
        intent=kind,
        budget_period="month" if kind == "rental" else None,
    )
    rid = UUID(requirement_command(settings, database, token, original)["id"])
    links = {"requirement_id": str(rid)}
    if context == "offering":
        _, manager = actor(settings, database, "manager")
        pid = property_draft(settings, database, manager)
        links.update(
            offering_id=offering_draft(
                settings,
                database,
                manager,
                pid,
                kind=kind,
                period="month" if kind == "rental" else None,
            )["offering_id"],
            expected_offering_version=1,
        )
    did = UUID(run(settings, database, token, new(contact, **links))["id"])
    if context == "proposal":
        run(
            settings,
            database,
            token,
            offer(price_period="month" if kind == "rental" else None),
            did,
        )
    before = read_detail(database, token, did)
    history = read_children(database, token, did, "history", ChildQuery())
    body = EditRequirement(
        **original.model_dump(exclude={"contact_id", "intent", "budget_period"}),
        intent="rental" if kind == "sale" else "sale",
        budget_period="month" if kind == "sale" else None,
        expected_version=1,
    )
    if context == "uncommitted":
        assert requirement_command(settings, database, token, body, rid)["version"] == 2
        assert requirement_read(database, token, rid)["intent"] == body.intent
    else:
        with pytest.raises(IdentityError, match="REQUIREMENT_INTENT_IN_USE"):
            requirement_command(settings, database, token, body, rid)
        assert requirement_read(database, token, rid)["version"] == 1
        assert requirement_read(database, token, rid)["intent"] == original.intent
        with database.session() as session:
            assert session.scalar(select(func.count()).select_from(RequirementReceipt)) == 1
    assert read_detail(database, token, did) == before
    assert read_children(database, token, did, "history", ChildQuery()) == history


pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_merge_preview_binds_deals_and_preserves_independence_targets_origins(settings, database):
    original_id, former, source, _ = setup(settings, database)
    _, current = actor(settings, database)
    survivor = cid(create_lead(settings, database, current, new_lead("+212600000002")))
    _, manager = actor(settings, database, "manager")
    requirement = UUID(
        requirement_command(
            settings,
            database,
            former,
            NewRequirement(contact_id=source, title="Recherche liée", intent="sale"),
        )["id"]
    )
    source_deal = UUID(
        run(settings, database, former, new(source, requirement_id=str(requirement)))["id"]
    )
    other_deal = UUID(run(settings, database, current, new(survivor))["id"])
    document = new_document(settings, database, former, "deal", source_deal, image_bytes())
    operation = intent("merge", survivor_id=survivor, survivor_expected_version=1)
    old = confirmation(settings, database, manager, source, operation)
    from app.contacts.ownership import preview

    impact = preview(
        database, manager, settings.facade_secret.get_secret_value(), source, operation
    )["impact"]
    assert impact["deal_links"] == 2 and impact["document_links"] == 1
    run(settings, database, former, edit(requirement_id=str(requirement)), source_deal)
    with pytest.raises(IdentityError, match="IMPACT_CHANGED"):
        mutate(
            database,
            manager,
            settings.facade_secret.get_secret_value(),
            uuid4(),
            source,
            old,
            "merge",
        )
    change(settings, database, manager, source, operation)
    row = read_detail(database, current, source_deal)
    assert row["contact"]["id"] == str(survivor) and row["origin_contact_id"] == str(source)
    assert row["created_by_user_id"] == str(original_id) and row["requirement_id"] == str(
        requirement
    )
    assert read_detail(database, current, other_deal)["version"] == 1
    assert read_list(database, current, DealQuery(contact_id=source))["total"] == 2
    assert read_document(database, current, UUID(document["id"]))["id"] == document["id"]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, former, source_deal)
    history = read_children(database, current, source_deal, "history", ChildQuery())["items"]
    assert history[0]["action"] == "contact_merged" and history[-1]["actor"]["id"] == str(
        original_id
    )


def test_transfer_current_owner_and_archive_read_only_apply_to_replays(settings, database):
    _, former, contact, _ = setup(settings, database)
    current_id, current = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    key, body = uuid4(), new(contact)
    did = UUID(run(settings, database, former, body, key=key)["id"])
    change(settings, database, manager, contact, intent("assign", primary_agent_id=current_id))
    assert read_detail(database, current, did)["contact"]["primary_agent"]["id"] == str(current_id)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        run(settings, database, former, body, key=key)
    version = contact_read(database, manager, "contacts", contact)["version"]
    change(settings, database, manager, contact, intent("archive", version=version))
    assert read_list(database, manager, DealQuery(archive="archived"))["total"] == 1
    assert read_detail(database, manager, did)["contact"]["archived_at"] is not None
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, current, did)
    with pytest.raises(IdentityError, match="CONTACT_ARCHIVED"):
        run(settings, database, manager, edit(), did)


@pytest.mark.anyio
async def test_private_deal_file_real_scan_and_post_permit_scope_revocation(settings, database):
    _, owner, contact, _ = setup(settings, database)
    next_id, next_owner = actor(settings, database)
    _, manager = actor(settings, database, "manager")
    did = UUID(run(settings, database, owner, new(contact))["id"])
    data = image_bytes()
    document = new_document(settings, database, owner, "deal", did, data)
    upload = grant(database, owner, document)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        list_documents(database, next_owner, "deal", did, 1, 20)
    async with client_for(create_app(settings)) as client:
        sent = await client.put(
            f"/api/v1/transfers/{upload['permit_id']}",
            headers=headers(settings, upload),
            content=data,
        )
        assert sent.status_code == 200 and sent.json()["state"] == "pending_scan"
        assert run_once(database, settings)
        clean = read_document(database, owner, UUID(document["id"]))
        assert clean["versions"][0]["state"] == "clean"
        download = grant(database, owner, clean, "download", upload["version_id"])
        change(settings, database, manager, contact, intent("assign", primary_agent_id=next_id))
        assert (
            await client.get(
                f"/api/v1/transfers/{download['permit_id']}", headers=headers(settings, download)
            )
        ).status_code == 404
        current = read_document(database, next_owner, UUID(document["id"]))
        fresh = grant(database, next_owner, current, "download", upload["version_id"])
        response = await client.get(
            f"/api/v1/transfers/{fresh['permit_id']}", headers=headers(settings, fresh)
        )
        assert response.status_code == 200 and response.content == data


def test_populated_prior_schema_preserved_and_nonempty_downgrade_refused(settings, database):
    _, token, contact, enquiry = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    oid = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    requirement = UUID(
        requirement_command(
            settings,
            database,
            token,
            NewRequirement(
                contact_id=contact,
                title="Recherche préservée",
                intent="rental",
                budget_period="month",
            ),
        )["id"]
    )
    with database.engine.connect() as connection:
        before = connection.execute(
            text("SELECT id,price_mad,price_period,version FROM offering WHERE id=:id"), {"id": oid}
        ).one()
        original = connection.execute(
            text(
                "SELECT id,contact_id,origin_contact_id,created_by_user_id "
                "FROM requirement WHERE id=:id"
            ),
            {"id": requirement},
        ).one()
    assert migrate("downgrade", "0012_requirements_shortlists").returncode == 0
    try:
        with database.engine.connect() as connection:
            assert (
                connection.execute(
                    text("SELECT id,price_mad,price_period,version FROM offering WHERE id=:id"),
                    {"id": oid},
                ).one()
                == before
            )
        assert migrate("upgrade", "head").returncode == 0
        with database.engine.connect() as connection:
            assert (
                connection.execute(
                    text(
                        "SELECT id,contact_id,origin_contact_id,created_by_user_id "
                        "FROM requirement WHERE id=:id"
                    ),
                    {"id": requirement},
                ).one()
                == original
            )
        did = UUID(
            run(
                settings,
                database,
                token,
                new(
                    contact,
                    enquiry_id=str(enquiry),
                    requirement_id=str(requirement),
                    offering_id=str(oid),
                    expected_offering_version=1,
                ),
            )["id"]
        )
        assert migrate("downgrade", "0012_requirements_shortlists").returncode != 0
        assert read_detail(database, token, did)["offering"]["id"] == str(oid)
    finally:
        assert migrate("upgrade", "head").returncode == 0
