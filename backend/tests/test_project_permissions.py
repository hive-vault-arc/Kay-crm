"""Agent project editing without manager stock or private-contact authority."""

from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from sqlalchemy import select, update

from app.identity.models import AGENCY_ID, Agency, User
from app.identity.security import IdentityError, csrf_token
from app.inventory.contracts import EditProperty, NewOffering, Owners
from app.inventory.hierarchy_contracts import ArchiveDevelopment, EditDevelopment
from app.inventory.hierarchy_models import Development
from app.inventory.models import InventoryEvent
from app.inventory.queries import read_detail
from app.main import create_app
from tests.contact_support import actor, create_lead, new_lead
from tests.identity_support import observe_two_lock_waiters
from tests.test_auth import authority
from tests.test_developments import development, hierarchy, read, structure, unit
from tests.test_foundation import client_for
from tests.test_inventory import property_draft, run
from tests.test_ownership import cid

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def test_agent_creates_edits_structure_units_and_standalone_with_true_actor(settings, database):
    aid, token = actor(settings, database)
    did = development(settings, database, token)
    bid, floors, tid = hierarchy(settings, database, token, did)
    pid = unit(settings, database, token, did, floors[0], tid)
    structure(settings, database, token, did, "edit-block", bid, "B1-EDIT")
    structure(settings, database, token, did, "edit-floor", floors[0], "F2-EDIT")
    structure(settings, database, token, did, "edit-type", tid, "T2-EDIT")
    version = read(database, token, target=did)["version"]
    body = EditDevelopment(
        reference="AGENT-PROJECT",
        name="Programme modifié",
        expected_version=version,
        briefing_text="Présentation partagée synthétique",
    )
    key = uuid4()
    saved = run(settings, database, token, "development-edit", body, did, key)
    assert run(settings, database, token, "development-edit", body, did, key) == saved
    with pytest.raises(IdentityError, match="IDEMPOTENCY_CONFLICT"):
        run(
            settings,
            database,
            token,
            "development-edit",
            body.model_copy(
                update={"developer_contact_id": None},
            ),
            did,
            key,
        )
    with pytest.raises(IdentityError, match="INVENTORY_VERSION_CONFLICT"):
        run(settings, database, token, "development-edit", body, did)
    for target, fields in (
        (pid, {"development_id": did, "floor_id": floors[0], "unit_type_id": tid}),
        (property_draft(settings, database, token), {}),
    ):
        run(
            settings,
            database,
            token,
            "edit-property",
            EditProperty(
                reference=f"AGENT-{target}",
                category="apartment",
                expected_version=1,
                location="Localisation synthétique",
                **fields,
            ),
            target,
        )
        assert read_detail(database, token, target)["location"] == "Localisation synthétique"
    with database.session() as session:
        events = session.scalars(select(InventoryEvent)).all()
        assert len(events) >= 12 and all(row.actor_user_id == aid for row in events)


def test_agent_preserves_hidden_developer_and_cannot_link_or_remove_private_contact(
    settings,
    database,
):
    _, manager = actor(settings, database, "manager")
    _, owner = actor(settings, database)
    _, agent = actor(settings, database)
    private_id = cid(create_lead(settings, database, owner))
    did = development(settings, database, manager, developer_contact_id=private_id)
    assert read(database, agent, target=did)["developer"]["contact"] is None
    body = EditDevelopment(reference="PRIVATE-LINK", name="Faits partagés", expected_version=1)
    run(settings, database, agent, "development-edit", body, did)
    with database.session() as session:
        assert session.get(Development, did).developer_contact_id == private_id
    for target in (None, uuid4()):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            run(
                settings,
                database,
                agent,
                "development-edit",
                EditDevelopment(
                    reference="PRIVATE-LINK",
                    name="Faits partagés",
                    expected_version=2,
                    developer_contact_id=target,
                ),
                did,
            )
    for target in (private_id, uuid4()):
        with pytest.raises(IdentityError, match="NOT_FOUND"):
            development(settings, database, agent, developer_contact_id=target)
    assert read(database, agent, target=did)["version"] == 2
    accessible = cid(create_lead(settings, database, agent, new_lead("+212600000002")))
    own = development(settings, database, agent, developer_contact_id=accessible)
    assert read(database, agent, target=own)["developer"]["contact"]["id"] == str(accessible)
    run(
        settings,
        database,
        agent,
        "development-edit",
        EditDevelopment(
            reference="OWN-LINK",
            name="Faits partagés",
            expected_version=1,
            developer_contact_id=None,
        ),
        own,
    )
    with database.session() as session:
        assert session.get(Development, own).developer_contact_id is None


@pytest.mark.parametrize(
    "operation",
    [
        "owners",
        "development-owners",
        "create-offering",
        "edit-offering",
        "confirm-availability",
        "development-confirm",
        "property-archive",
        "property-restore",
        "development-archive",
        "development-restore",
        "external-outcome",
        "development-external-outcome",
        "unknown-operation",
    ],
)
def test_agent_project_rights_do_not_grant_other_inventory_commands(settings, database, operation):
    _, token = actor(settings, database)
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        run(settings, database, token, operation, Owners(expected_version=1, owners=[]), uuid4())


def test_archived_project_and_property_remain_read_only_for_agents(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    did = development(settings, database, agent)
    pid = property_draft(settings, database, agent)
    body = ArchiveDevelopment(expected_version=1, reason="Archivage synthétique")
    run(settings, database, manager, "development-archive", body, did)
    run(settings, database, manager, "property-archive", body, pid)
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(
            settings,
            database,
            agent,
            "development-edit",
            EditDevelopment(
                reference="ARCHIVED",
                name="Modification refusée",
                expected_version=2,
            ),
            did,
        )
    with pytest.raises(IdentityError, match="STOCK_REVIEW_REQUIRED"):
        run(
            settings,
            database,
            agent,
            "edit-property",
            EditProperty(
                reference="ARCHIVED",
                category="land",
                expected_version=2,
            ),
            pid,
        )


@pytest.mark.anyio
@pytest.mark.parametrize("role", ["agent", "manager", "administrator"])
async def test_project_http_create_edit_preserves_auth_csrf_validation(settings, database, role):
    _, token = actor(settings, database, role)
    headers = {
        **authority(settings),
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
        "Idempotency-Key": str(uuid4()),
    }
    async with client_for(create_app(settings)) as client:
        body = {"reference": "HTTP-PROJECT", "name": "Projet synthétique"}
        assert (await client.post("/api/v1/developments", json=body)).status_code == 403
        assert (
            await client.post(
                "/api/v1/developments",
                headers={
                    **headers,
                    "X-CSRF-Token": "invalid",
                },
                json=body,
            )
        ).status_code == 403
        assert (
            await client.post(
                "/api/v1/developments",
                headers=headers,
                json={
                    **body,
                    "created_by_user_id": str(uuid4()),
                },
            )
        ).status_code == 422
        created = await client.post("/api/v1/developments", headers=headers, json=body)
        assert created.status_code == 200
        did = created.json()["development_id"]
        assert (
            await client.post("/api/v1/developments", headers=headers, json=body)
        ).json() == created.json()
        patched = await client.patch(
            f"/api/v1/developments/{did}",
            headers=headers,
            json={
                **body,
                "expected_version": 1,
                "name": "Projet modifié",
            },
        )
        assert patched.status_code == 200 and patched.json()["version"] == 2
        if role == "agent":
            denied = await client.post(
                "/api/v1/offerings",
                headers=headers,
                json=NewOffering(
                    development_id=UUID(did),
                    expected_development_version=2,
                    kind="sale",
                ).model_dump(mode="json"),
            )
            assert denied.status_code == 403


def test_waiting_agent_edit_and_receipt_replay_recheck_revocation(settings, database):
    aid, token = actor(settings, database)
    did = development(settings, database, token)
    body = EditDevelopment(reference="WAITING", name="Projet synthétique", expected_version=1)
    key = uuid4()
    run(settings, database, token, "development-edit", body, did, key)

    def attempt():
        try:
            run(settings, database, token, "development-edit", body, did, key)
            return "ok"
        except IdentityError as error:
            return error.code

    with database.session() as lock, lock.begin(), ThreadPoolExecutor(2) as pool:
        lock.scalar(select(Agency).where(Agency.id == AGENCY_ID).with_for_update())
        futures = [pool.submit(attempt) for _ in range(2)]
        observe_two_lock_waiters(database, "agency")
        lock.execute(update(User).where(User.id == aid).values(state="disabled", version=2))
        lock.commit()
        assert all(future.result() == "UNAUTHENTICATED" for future in futures)
