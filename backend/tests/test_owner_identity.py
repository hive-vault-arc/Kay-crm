"""Keep owner CIN fields and identity copies inside the private contact scope."""

from typing import cast
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.contacts.commands import command
from app.contacts.contracts import EditContact, ListQuery, NewContact
from app.contacts.queries import read_detail, read_list
from app.discovery.contracts import SearchQuery
from app.discovery.search import search
from app.files.service import list_documents, read_document
from app.files.worker import run_once
from app.identity.security import IdentityError
from app.main import create_app
from tests.contact_support import actor
from tests.file_support import grant, image_bytes, new_document
from tests.test_files import headers
from tests.test_foundation import client_for

pytestmark = [pytest.mark.postgres, pytest.mark.usefixtures("clean_identity")]


def owner_fields() -> dict[str, object]:
    return {
        "name": "Propriétaire synthétique",
        "phones": [{"number": "+212600000001", "is_primary": True}],
        "emails": [{"email": "synthetic-owner@example.com", "is_primary": True}],
        "roles": ["owner"],
    }


def test_optional_cin_uses_canonical_contact_and_private_reads(settings, database):
    _, token = actor(settings, database)
    _, outsider = actor(settings, database)
    fields = owner_fields()
    secret = settings.facade_secret.get_secret_value()
    body = NewContact.model_validate({**fields, "national_id_number": " qa-4012 "})
    result = command(database, token, secret, uuid4(), "contacts", body)
    cid = UUID(cast(str, result["id"]))
    assert "national_id_number" not in result
    assert "national_id_number" not in read_detail(database, token, "contacts", cid)
    assert "national_id_number" not in str(read_list(database, token, "contacts", ListQuery()))
    assert search(database, token, SearchQuery(q="QA-4012"))["total"] == 0

    def current():
        return read_detail(database, token, "contacts", cid, owner_identity=True)

    assert current()["national_id_number"] == "QA-4012"
    assert current()["primary_email"] == "synthetic-owner@example.com"
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_detail(database, outsider, "contacts", cid, owner_identity=True)

    for version, patch in ((1, {}), (2, {"national_id_number": None})):
        change = EditContact.model_validate({**fields, **patch, "expected_version": version})
        command(database, token, secret, uuid4(), "contacts", change, cid)
        assert current()["national_id_number"] == ("QA-4012" if version == 1 else None)

    for patch in ({"type": "organization"}, {"roles": ["buyer"]}, {"national_id_number": "<1>"}):
        with pytest.raises(ValidationError):
            NewContact.model_validate({**fields, "national_id_number": "QA-4012", **patch})


@pytest.mark.anyio
async def test_identity_copy_is_private_and_must_pass_antivirus(settings, database):
    _, token = actor(settings, database)
    _, outsider = actor(settings, database)
    result = command(
        database,
        token,
        settings.facade_secret.get_secret_value(),
        uuid4(),
        "contacts",
        NewContact.model_validate(owner_fields()),
    )
    cid = UUID(cast(str, result["id"]))
    data = image_bytes()
    card = new_document(
        settings,
        database,
        token,
        "contact",
        cid,
        data,
        filename="synthetic-identity-copy.png",
        purpose="identity_card",
    )
    did = UUID(card["id"])
    assert list_documents(database, token, "contact", cid, 1, 20)["total"] == 0
    assert list_documents(database, token, "contact", cid, 1, 20, "identity_card")["total"] == 1
    assert search(database, token, SearchQuery(q="synthetic-identity-copy"))["total"] == 0
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        read_document(database, outsider, did)
    with pytest.raises(IdentityError, match="NOT_FOUND"):
        list_documents(database, outsider, "contact", cid, 1, 20, "identity_card")
    permit = grant(database, token, card)
    async with client_for(create_app(settings)) as client:
        transfer = f"/api/v1/transfers/{permit['permit_id']}"
        response = await client.put(transfer, headers=headers(settings, permit), content=data)
        assert response.status_code == 200
        assert response.json()["state"] == "pending_scan"
        with pytest.raises(IdentityError, match="FILE_NOT_CLEAN"):
            grant(
                database,
                token,
                read_document(database, token, did),
                "download",
                permit["version_id"],
            )
        assert run_once(database, settings)
        scanned = read_document(database, token, did)
        assert scanned["versions"][0]["state"] == "clean"
        download = grant(database, token, scanned, "download", permit["version_id"])
        got = await client.get(
            f"/api/v1/transfers/{download['permit_id']}", headers=headers(settings, download)
        )
        assert got.status_code == 200 and got.content == data
