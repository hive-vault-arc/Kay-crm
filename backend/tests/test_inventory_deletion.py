"""Permanent catalogue removal must work with stock, media, retries and history."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from app.deals.queries import read_detail as read_deal
from app.files.models import DocumentVersion
from app.identity.security import IdentityError, csrf_token
from app.inventory.contracts import ForceDelete, InventoryQuery
from app.inventory.deletion import cleanup_once
from app.inventory.deletion_models import BlobDeletion, PropertyIdentity
from app.inventory.hierarchy_models import Block, Development, Floor, UnitType
from app.inventory.models import Offering, Property
from app.inventory.queries import read_detail, read_list
from app.inventory.selection import select_offerings
from app.main import create_app
from app.videos.storage import VideoStorage
from tests.contact_support import actor
from tests.deal_support import run as deal_command
from tests.test_developments import development, hierarchy, unit
from tests.test_foundation import client_for
from tests.test_inventory import offering_draft, property_draft, run
from tests.test_outcomes import body as close_body
from tests.test_reservations import fixture as reserved_fixture
from tests.test_reservations import reviewed

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def remove(settings, database, token, target, *, programme=False, key=None):
    return run(
        settings,
        database,
        token,
        "development-delete" if programme else "property-delete",
        ForceDelete(confirm=True),
        target,
        key,
    )


def test_current_offer_deletion_retry_race_and_agent_denial(settings, database):
    _, manager = actor(settings, database, "manager")
    _, agent = actor(settings, database)
    pid = property_draft(settings, database, manager)
    oid = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    with pytest.raises(IdentityError, match="FORBIDDEN"):
        remove(settings, database, agent, pid)
    key = uuid4()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(lambda _: remove(settings, database, manager, pid, key=key), range(2))
        )
    assert results[0] == results[1]
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, manager, pid)
    assert read_list(database, manager, "properties", InventoryQuery())["total"] == 0
    with database.session() as session:
        assert session.get(Property, pid) is None
        assert session.get_one(PropertyIdentity, pid).deleted_at is not None
        assert session.get_one(Offering, oid).state == "withdrawn"
        assert (
            select_offerings(session, InventoryQuery(state="all"), lambda row: {"id": str(row.id)})[
                "total"
            ]
            == 0
        )
    assert remove(settings, database, manager, pid, key=key) == results[0]


def test_programme_deletion_removes_all_units_and_hierarchy(settings, database):
    _, manager = actor(settings, database, "manager")
    did = development(settings, database, manager)
    _, floors, template = hierarchy(settings, database, manager, did)
    pids = [unit(settings, database, manager, did, floor, template) for floor in floors]
    offering_draft(settings, database, manager, pids[0])
    remove(settings, database, manager, did, programme=True)
    with database.session() as session:
        assert session.get(Development, did) is None
        assert not session.scalars(select(Property).where(Property.id.in_(pids))).all()
        for model in (Block, Floor, UnitType):
            assert session.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize("closed", [False, True])
def test_reserved_and_completed_deals_keep_their_context(settings, database, closed):
    _, token, _, manager, pid, _, did = reserved_fixture(settings, database)
    if closed:
        deal_command(settings, database, token, close_body(database, token, did), did)
    else:
        deal_command(settings, database, token, reviewed(database, token, did), did)
    remove(settings, database, manager, pid)
    record = read_deal(database, token, did)
    assert record["stage"] == ("won" if closed else "new")
    assert record["active_reservation"] is None
    assert record["offering"]["target"]["label"] == "Bien supprimé"
    assert record["offering"]["target"]["archived"]


def test_failed_deletion_rolls_back_catalogue_and_receipt(settings, database, monkeypatch):
    from app.inventory import deletion

    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    real_record = deletion.record

    def interrupted(*args, **kwargs):
        real_record(*args, **kwargs)
        raise RuntimeError("SYNTHETIC_DELETE_INTERRUPTED")

    monkeypatch.setattr(deletion, "record", interrupted)
    key = uuid4()
    with pytest.raises(RuntimeError, match="SYNTHETIC_DELETE_INTERRUPTED"):
        remove(settings, database, manager, pid, key=key)
    assert read_detail(database, manager, pid)["version"] == 1
    monkeypatch.setattr(deletion, "record", real_record)
    remove(settings, database, manager, pid, key=key)
    with pytest.raises(IntegrityError), database.session() as session, session.begin():
        session.add(
            Property(
                id=pid,
                reference="SYN-RESURRECT",
                category="land",
                created_by_user_id=session.get_one(PropertyIdentity, pid).created_by_user_id,
            )
        )


def test_linked_tasks_visits_shortlists_survive_and_new_links_are_denied(settings, database):
    from app.project_links.contracts import NewLink
    from app.project_links.service import mutate_link
    from app.requirements.contracts import ShortlistChange
    from app.requirements.queries import read_detail as requirement_detail
    from app.schedule.queries import detail as visit_detail
    from app.work.contracts import EditTask
    from app.work.queries import detail as task_detail
    from tests.deal_support import new as new_deal
    from tests.deal_support import setup
    from tests.test_requirements import new as new_requirement
    from tests.test_requirements import run as requirement_command
    from tests.test_schedule import booking
    from tests.test_schedule import run as visit_command
    from tests.test_work import new as new_task
    from tests.test_work import run as task_command

    uid, token, cid, eid = setup(settings, database)
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    oid = UUID(offering_draft(settings, database, manager, pid)["offering_id"])
    secret = settings.facade_secret.get_secret_value()
    mutate_link(
        database,
        token,
        secret,
        uuid4(),
        "enquiries",
        eid,
        NewLink(kind="discussed", property_id=pid),
    )
    task = new_task(uid, cid, enquiry_id=eid, property_id=pid)
    tid = UUID(task_command(settings, database, token, task)["id"])
    vid = UUID(
        visit_command(
            settings,
            database,
            token,
            booking(uid, cid, enquiry_id=eid, property_id=pid, type="office"),
        )["id"]
    )
    rid = UUID(requirement_command(settings, database, token, new_requirement(cid))["id"])
    requirement_command(
        settings,
        database,
        token,
        ShortlistChange(expected_version=1, offering_id=oid, expected_offering_version=1),
        rid,
    )
    remove(settings, database, manager, pid)
    assert task_detail(database, token, tid)["property_id"] == str(pid)
    assert visit_detail(database, token, vid)["property_id"] == str(pid)
    assert (
        requirement_detail(database, token, rid)["shortlist"][0]["offering"]["target"]["label"]
        == "Bien supprimé"
    )
    task_command(
        settings,
        database,
        token,
        EditTask.model_validate(
            task.model_dump(exclude={"contact_id"})
            | {"expected_version": 1, "title": "Suivi après retrait du bien"}
        ),
        tid,
    )
    with database.session() as session:
        version = session.get_one(Offering, oid).version
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        deal_command(
            settings,
            database,
            token,
            new_deal(cid, offering_id=oid, expected_offering_version=version),
        )
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        requirement_command(
            settings,
            database,
            token,
            ShortlistChange(expected_version=2, offering_id=oid, expected_offering_version=version),
            rid,
        )


def test_storage_cleanup_is_durable_and_idempotent(settings, database, monkeypatch):
    from app.files.storage import PrivateStorage
    from tests.file_support import grant, image_bytes, new_document

    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    doc = new_document(
        settings,
        database,
        manager,
        "property",
        pid,
        image_bytes("WEBP"),
        "SYN-delete.webp",
        "image/webp",
        purpose="photo",
    )
    grant(database, manager, doc)
    with database.session() as session:
        key = session.scalar(select(DocumentVersion.object_key))
    path = PrivateStorage(settings).path(key)
    path.write_bytes(b"synthetic staged file")
    remove(settings, database, manager, pid)
    with database.session() as session, session.begin():
        session.execute(update(BlobDeletion).values(available_at=datetime.now(UTC)))
    original = VideoStorage.delete_blob

    def outage(*args):
        raise IdentityError("FILE_STORAGE_UNAVAILABLE", 503)

    monkeypatch.setattr(VideoStorage, "delete_blob", outage)
    assert cleanup_once(database, settings)
    assert path.exists()
    with database.session() as session, session.begin():
        assert session.get_one(BlobDeletion, key).attempts == 1
        session.execute(update(BlobDeletion).values(available_at=datetime.now(UTC)))
    monkeypatch.setattr(VideoStorage, "delete_blob", original)
    assert cleanup_once(database, settings)
    assert not path.exists()
    assert not cleanup_once(database, settings)


@pytest.mark.anyio
async def test_delete_http_requires_confirmation_csrf_and_retry_key(settings, database):
    _, manager = actor(settings, database, "manager")
    pid = property_draft(settings, database, manager)
    secret = settings.facade_secret.get_secret_value()
    headers = {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": manager,
        "X-CSRF-Token": csrf_token(secret, manager),
        "Origin": settings.frontend_origin,
        "Idempotency-Key": str(uuid4()),
    }
    path = f"/api/v1/properties/{pid}/delete"
    async with client_for(create_app(settings)) as client:
        response = await client.post(path, json={"confirm": True})
        assert response.status_code in (401, 403)
        for omitted in ("X-CSRF-Token", "Origin", "Idempotency-Key"):
            response = await client.post(
                path,
                json={"confirm": True},
                headers={k: v for k, v in headers.items() if k != omitted},
            )
            assert response.status_code in (403, 422)
        for invalid in (
            {},
            {"confirm": False},
            {"confirm": 1},
            {"confirm": "true"},
            {"confirm": True, "release_stock": True},
        ):
            response = await client.post(path, json=invalid, headers=headers)
            assert response.status_code == 422
        one = await client.post(path, json={"confirm": True}, headers=headers)
        two = await client.post(path, json={"confirm": True}, headers=headers)
        assert one.status_code == two.status_code == 200
        assert one.json() == two.json()
        response = await client.post(
            path, json={"confirm": True}, headers={**headers, "Idempotency-Key": str(uuid4())}
        )
        assert response.status_code == 404
