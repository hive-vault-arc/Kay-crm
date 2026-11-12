"""Public listings share only explicitly approved facts and clean inventory photos."""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from PIL import Image

from app.files.models import Document, DocumentVersion
from app.files.storage import PrivateStorage
from app.identity.security import csrf_token
from app.inventory.contracts import ListingDetails, PropertyFields
from app.inventory.models import Property
from app.main import create_app
from app.shares.models import ListingLink
from tests.contact_support import actor
from tests.test_developments import development, hierarchy
from tests.test_foundation import client_for
from tests.test_inventory import property_draft, run

pytestmark = [pytest.mark.postgres, pytest.mark.anyio, pytest.mark.usefixtures("clean_identity")]
PUBLIC = "/api/v1/client-listing"


def staff_headers(settings, token, key=None):
    secret = settings.facade_secret.get_secret_value()
    return {
        "X-Kay-Facade-Secret": secret,
        "X-Kay-Session": token,
        "X-CSRF-Token": csrf_token(secret, token),
        "Origin": settings.frontend_origin,
        "Idempotency-Key": str(key or uuid4()),
    }


def public_headers(settings, token):
    return {"Origin": settings.frontend_origin, "X-Kay-Listing-Link": token}


def upload_fixture(settings, database, actor_id, parent, *, clean=True):
    image = Image.new("RGB", (64, 32), "gold")
    exif = image.getexif()
    exif[270] = "synthetic private metadata"
    output = BytesIO()
    image.save(output, format="WEBP", exif=exif)
    data = output.getvalue()
    key, version_id = uuid4(), uuid4()
    with database.session() as session, session.begin():
        document = Document(
            **parent,
            filename="internal-reference.webp",
            mime_type="image/webp",
            purpose="photo",
            size_bytes=len(data),
            created_by_user_id=actor_id,
        )
        session.add(document)
        session.flush()
        session.add(
            DocumentVersion(
                id=version_id,
                document_id=document.id,
                object_key=key,
                size_bytes=len(data),
                created_by_user_id=actor_id,
                sha256=sha256(data).digest(),
                state="clean" if clean else "pending_scan",
                scanned_at=datetime.now(UTC) if clean else None,
            )
        )
    PrivateStorage(settings).path(key).write_bytes(data)
    return version_id, key


async def test_ready_draft_and_atomic_publish_for_large_gallery(settings, database):
    settings = settings.model_copy(update={"inventory_shares_enabled": True})
    manager, manager_token = actor(settings, database, "manager")
    _, agent_token = actor(settings, database)
    record = run(
        settings,
        database,
        manager_token,
        "create-property",
        PropertyFields(
            reference="SYNTHETIC-DRAFT-REFERENCE",
            marketing_name="Appartement synthétique",
            category="apartment",
            location="12 rue privée",
            listing_details=ListingDetails(
                description="Description de l’annonce.",
                city="Tanger",
                neighborhood="Iberia",
                address="12 rue privée",
                google_maps_url="https://maps.app.goo.gl/test",
            ),
        ),
    )
    identifier = UUID(record["property_id"])
    path = f"/api/v1/listing-shares/property/{identifier}"
    fixtures = [
        upload_fixture(settings, database, manager, {"property_id": identifier}) for _ in range(26)
    ]
    pending, key = upload_fixture(
        settings, database, manager, {"property_id": identifier}, clean=False
    )
    try:
        async with client_for(create_app(settings)) as client:
            manager_headers = staff_headers(settings, manager_token)
            agent_headers = staff_headers(settings, agent_token)
            reply = await client.get(f"{path}/draft", headers=manager_headers)
            assert reply.status_code == 200
            state = reply.json()
            draft = state["draft"]
            assert {key: draft[key] for key in ("title", "description", "neighbourhood")} == {
                "title": "Appartement synthétique",
                "description": "Description de l’annonce.",
                "neighbourhood": "Iberia, Tanger",
            }
            assert "rue privée" not in reply.text and "maps.app" not in reply.text
            assert "draft" not in (await client.get(f"{path}/draft", headers=agent_headers)).json()
            options = [photo["version_id"] for photo in draft["photos"]]
            assert set(options) == {str(version_id) for version_id, _ in fixtures}
            selected = options[:-1]
            body = {
                **{key: draft[key] for key in ("title", "description", "neighbourhood")},
                "photos": selected,
                "price_mad": None,
                "price_period": None,
                "target_version": state["target_version"],
                "expected_version": state["version"],
            }
            forbidden = await client.post(f"{path}/publish", json=body, headers=agent_headers)
            assert forbidden.status_code == 403
            invalid = await client.post(
                f"{path}/publish",
                json={**body, "photos": [*selected, str(pending)]},
                headers=manager_headers,
            )
            assert invalid.status_code == 422
            assert (await client.get(path, headers=manager_headers)).json()["active"] is False

            issued = await client.post(f"{path}/publish", json=body, headers=manager_headers)
            assert issued.status_code == 200
            retried = await client.post(f"{path}/publish", json=body, headers=manager_headers)
            assert retried.json() == issued.json()
            latest = (await client.get(path, headers=manager_headers)).json()
            conflict = await client.post(
                f"{path}/publish",
                json={
                    **body,
                    "description": "Autre description.",
                    "expected_version": latest["version"],
                },
                headers=manager_headers,
            )
            assert conflict.status_code == 409
            headers = public_headers(settings, issued.json()["token"])
            published = await client.get(PUBLIC, headers=headers)
            assert published.json()["description"] == "Description de l’annonce."
            assert published.json()["photos"] == list(range(25))
            assert published.json()["price_mad"] is None
            assert (await client.get(f"{PUBLIC}/photos/24", headers=headers)).status_code == 200
            assert (await client.get(f"{PUBLIC}/photos/25", headers=headers)).status_code == 404
    finally:
        storage = PrivateStorage(settings)
        storage.path(key).unlink(missing_ok=True)
        for _, object_key in fixtures:
            storage.path(object_key).unlink(missing_ok=True)


@pytest.mark.parametrize("kind", ["property", "unit", "development"])
async def test_approval_and_link_are_scoped_and_revocable(settings, database, kind):
    settings = settings.model_copy(update={"inventory_shares_enabled": True})
    manager, manager_token = actor(settings, database, "manager")
    _, agent_token = actor(settings, database)
    _, other_agent = actor(settings, database)
    other_property = property_draft(settings, database, manager_token)
    parent = development(settings, database, manager_token)
    if kind == "development":
        identifier = parent
    else:
        _, floors, unit_type = (
            hierarchy(settings, database, manager_token, parent)
            if kind == "unit"
            else (None, [None], None)
        )
        record = run(
            settings,
            database,
            manager_token,
            "create-property",
            PropertyFields(
                reference="SYNTHETIC-PRIVATE-REF",
                category="apartment",
                area_sqm="91.25",
                rooms=3,
                location="Synthetic exact address",
                development_id=parent if kind == "unit" else None,
                floor_id=floors[0],
                unit_type_id=unit_type,
            ),
        )
        identifier = UUID(record["property_id"])
    scope = "development" if kind == "development" else "property"
    path = f"/api/v1/listing-shares/{scope}/{identifier}"
    selected, first = upload_fixture(settings, database, manager, {f"{scope}_id": identifier})
    pending, second = upload_fixture(
        settings, database, manager, {f"{scope}_id": identifier}, clean=False
    )
    unlisted, third = upload_fixture(settings, database, manager, {f"{scope}_id": identifier})
    foreign, fourth = upload_fixture(settings, database, manager, {"property_id": other_property})
    headers = staff_headers(settings, manager_token)
    agent_headers = staff_headers(settings, agent_token)
    secret = settings.facade_secret.get_secret_value()
    try:
        async with client_for(create_app(settings)) as client:
            assert (await client.get(path)).status_code == 403
            status = (await client.get(path, headers=headers)).json()
            assert status["active"] is False
            approval = {
                "title": "Fiche synthétique",
                "description": "Description vérifiée",
                "neighbourhood": "Quartier synthétique",
                "price_mad": "1950000.50",
                "price_period": "sale",
                "photos": [str(selected)],
                "target_version": status["target_version"],
                "expected_version": 0,
            }
            assert (
                await client.post(f"{path}/approve", json=approval, headers=agent_headers)
            ).status_code == 403
            for denied in (pending, foreign):
                assert (
                    await client.post(
                        f"{path}/approve",
                        json={**approval, "photos": [str(denied)]},
                        headers=headers,
                    )
                ).status_code == 422
            assert (
                await client.post(
                    f"{path}/approve", json=approval, headers={**headers, "X-CSRF-Token": ""}
                )
            ).status_code == 403
            assert (
                await client.post(f"{path}/approve", json=approval, headers=headers)
            ).status_code == 200
            assert (
                await client.post(f"{path}/approve", json=approval, headers=headers)
            ).status_code == 200
            status = (await client.get(path, headers=agent_headers)).json()
            assert status["active"] is True and status["can_approve"] is False
            request_key = uuid4()
            request_headers = staff_headers(settings, agent_token, request_key)
            body = {"expected_version": status["version"]}
            issued = await client.post(f"{path}/links", json=body, headers=request_headers)
            assert issued.status_code == 200
            assert (
                await client.post(f"{path}/links", json=body, headers=request_headers)
            ).json() == issued.json()
            token = issued.json()["token"]
            capability = public_headers(settings, token)
            assert (await client.get(PUBLIC)).status_code == 404
            assert (
                await client.get(
                    PUBLIC, headers={**capability, "Origin": "https://unrelated.example"}
                )
            ).status_code == 404
            assert (
                await client.get(PUBLIC, headers=public_headers(settings, "a" * 43))
            ).status_code == 404
            assert (
                await client.get(
                    path, headers={"X-Kay-Facade-Secret": secret, "X-Kay-Session": token}
                )
            ).status_code == 401
            public = await client.get(PUBLIC, headers=capability)
            assert public.status_code == 200
            assert public.headers["cache-control"] == "no-store"
            assert "noindex" in public.headers["x-robots-tag"]
            assert public.json() == {
                "title": "Fiche synthétique",
                "description": "Description vérifiée",
                "neighbourhood": "Quartier synthétique",
                "price_mad": "1950000.50",
                "price_period": "sale",
                "kind": scope,
                "category": "mixed" if scope == "development" else "apartment",
                "area_sqm": None if scope == "development" else "91.25",
                "rooms": None if scope == "development" else 3,
                "photos": [0],
            }
            image = await client.get(f"{PUBLIC}/photos/0", headers=capability)
            assert image.status_code == 200 and image.headers["content-type"] == "image/webp"
            with Image.open(BytesIO(image.content)) as cleaned:
                assert cleaned.size == (64, 32) and not cleaned.getexif()
            assert (await client.get(f"{PUBLIC}/photos/1", headers=capability)).status_code == 404
            assert str(unlisted) not in public.text
            with database.session() as session:
                link = session.get(ListingLink, request_key)
                assert link is not None
                assert link.token_hash == sha256(token.encode()).digest()
                assert link.expires_at - link.created_at == timedelta(days=30)
            other_headers = staff_headers(settings, other_agent)
            assert (await client.get(path, headers=other_headers)).json()["links"] == []
            revoke_path = f"{path}/links/{request_key}/revoke"
            assert (
                await client.post(revoke_path, json={}, headers=other_headers)
            ).status_code == 404
            assert (await client.post(revoke_path, json={}, headers=headers)).status_code == 200
            assert (await client.get(PUBLIC, headers=capability)).status_code == 404
            assert (await client.get(f"{PUBLIC}/photos/0", headers=capability)).status_code == 404
            expiry_key = uuid4()
            expiring = await client.post(
                f"{path}/links", json=body, headers=staff_headers(settings, agent_token, expiry_key)
            )
            assert expiring.status_code == 200
            with database.session() as session, session.begin():
                expired = session.get(ListingLink, expiry_key)
                assert expired is not None
                expired.created_at -= timedelta(days=31)
                expired.expires_at -= timedelta(days=31)
            assert (
                await client.get(PUBLIC, headers=public_headers(settings, expiring.json()["token"]))
            ).status_code == 404
            latest = await client.post(
                f"{path}/links", json=body, headers=staff_headers(settings, agent_token)
            )
            assert latest.status_code == 200
            latest_headers = public_headers(settings, latest.json()["token"])
            if scope == "property":
                with database.session() as session, session.begin():
                    record = session.get(Property, identifier)
                    assert record is not None
                    record.version += 1
            else:
                assert (
                    await client.post(f"{path}/withdraw", json=body, headers=headers)
                ).status_code == 200
            assert (await client.get(PUBLIC, headers=latest_headers)).status_code == 404
    finally:
        storage = PrivateStorage(settings)
        for key in (first, second, third, fourth):
            storage.path(key).unlink(missing_ok=True)


async def test_feature_is_off_by_default(settings, database):
    _, token = actor(settings, database)
    async with client_for(
        create_app(settings.model_copy(update={"inventory_shares_enabled": False}))
    ) as client:
        path = f"/api/v1/listing-shares/property/{uuid4()}"
        assert (await client.get(path, headers=staff_headers(settings, token))).json() == {
            "enabled": False
        }
        assert (
            await client.get(PUBLIC, headers=public_headers(settings, "a" * 43))
        ).status_code == 404
