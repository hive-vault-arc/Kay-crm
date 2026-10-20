"""Private Spaces transfer shares bytes between the API and worker without a public URL."""

import hashlib
import io
from uuid import uuid4

import pytest
from botocore.exceptions import ClientError
from pydantic import SecretStr

from app.files.storage import PrivateStorage
from app.identity.security import IdentityError
from app.settings import Settings


class Client:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.fail = False

    def put_object(self, **options: object) -> None:
        if self.fail:
            raise ClientError(
                {"Error": {"Code": "AccessDenied", "Message": "private"}}, "PutObject"
            )
        assert options["ContentType"] == "application/octet-stream"
        assert options["ContentLength"] == 5
        body = options["Body"]
        assert isinstance(body, io.BufferedReader)
        self.objects[str(options["Key"])] = body.read()

    def get_object(self, **options: object) -> dict[str, io.BytesIO]:
        if self.fail:
            raise ClientError(
                {"Error": {"Code": "AccessDenied", "Message": "private"}}, "GetObject"
            )
        return {"Body": io.BytesIO(self.objects[str(options["Key"])])}


@pytest.fixture
def storage(monkeypatch: pytest.MonkeyPatch, tmp_path):
    from app.files import storage as module

    monkeypatch.setattr(module, "BACKEND_ROOT", tmp_path / "backend")
    client = Client()
    settings = Settings.model_construct(
        app_environment="production",
        storage_backend="spaces",
        spaces_region="fra1",
        spaces_endpoint="https://fra1.digitaloceanspaces.com",
        spaces_bucket="synthetic-private",
        spaces_key=SecretStr("synthetic-key"),
        spaces_secret=SecretStr("synthetic-secret"),
    )
    item = PrivateStorage(settings)
    monkeypatch.setattr(item, "_client", lambda: client)
    return item, client


def test_spaces_publication_is_private_and_read_is_integrity_checked(storage) -> None:
    item, client = storage
    key = uuid4()
    item.path(key, partial=True).write_bytes(b"photo")
    item.promote(key)
    assert not item.path(key, partial=True).exists()
    assert not item.path(key).exists()
    assert list(client.objects) == [f"production/{key.hex}.blob"]
    digest = hashlib.sha256(b"photo").digest()
    assert item.read(key, 5, digest) == b"photo"
    with pytest.raises(IdentityError, match="FILE_INTEGRITY_ERROR"):
        item.read(key, 4, digest)


def test_spaces_failure_keeps_staging_and_hides_provider_details(storage, caplog) -> None:
    item, client = storage
    key = uuid4()
    item.path(key, partial=True).write_bytes(b"photo")
    client.fail = True
    with pytest.raises(IdentityError, match="FILE_STORAGE_UNAVAILABLE"):
        item.promote(key)
    assert item.path(key, partial=True).exists()
    assert "private" not in caplog.text
    assert "AccessDenied" in caplog.text
    with pytest.raises(IdentityError, match="FILE_STORAGE_UNAVAILABLE"):
        item.read(key, 5, hashlib.sha256(b"photo").digest())
