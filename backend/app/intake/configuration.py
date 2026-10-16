"""One local source, with signing material outside source and browser bundles."""

import hashlib
import json
import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict, SecretStr

from app.runtime import BACKEND_ROOT
from app.settings import Settings


class SigningKey(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_key: str
    secret: SecretStr

    def digest(self) -> bytes:
        return hashlib.sha256(self.secret.get_secret_value().encode()).digest()


def key_path(settings: Settings) -> Path:
    return BACKEND_ROOT / ".local-data" / "website" / (settings.app_environment + ".json")


def load_key(settings: Settings) -> SigningKey:
    try:
        path = key_path(settings)
        if path.stat().st_size > 1024:
            raise ValueError
        result = SigningKey.model_validate(json.loads(path.read_bytes()))
        if (
            not re.fullmatch(r"[a-z0-9_-]{1,40}", result.source_key)
            or len(result.secret.get_secret_value()) < 43
        ):
            raise ValueError
        return result
    except OSError, ValueError, TypeError:
        raise RuntimeError("WEBSITE_SOURCE_NOT_CONFIGURED") from None
