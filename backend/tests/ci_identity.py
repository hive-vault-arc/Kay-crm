"""CI cleanup trusts only the signed identities captured before its first migration."""

import hashlib
import hmac
import json
import os
from dataclasses import asdict
from pathlib import Path

from sqlalchemy.engine import make_url

from app.db.isolation import DatabaseIdentity
from app.runtime import BACKEND_ROOT
from app.settings import Settings

BASELINE = BACKEND_ROOT / ".local-data/ci-database-identities.json"
NAMES = ("kayrealestate", "kayrealestate_test", "kayrealestate_benchmark", "kayrealestate_recovery")
LOCAL_RECOVERY = DatabaseIdentity("7607060034405909976", 109063, "kayrealestate_recovery")


def signed_baseline(identities: dict[str, dict[str, object]], key: str) -> str:
    payload = {"workspace": str(BACKEND_ROOT.parent.resolve()), "identities": identities}
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    signature = hmac.new(key.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return json.dumps({"payload": payload, "signature": signature})


def require_recovery_identity(settings: Settings, observed: DatabaseIdentity) -> None:
    if os.environ.get("GITHUB_ACTIONS") != "true":
        if observed != LOCAL_RECOVERY:
            raise RuntimeError("LOCAL_RECOVERY_IDENTITY_REFUSED")
        return
    try:
        if (
            os.environ.get("CI") != "true"
            or os.name != "nt"
            or Path(os.environ.get("GITHUB_WORKSPACE", "")).resolve()
            != BACKEND_ROOT.parent.resolve()
            or BASELINE.stat().st_size > 4096
        ):
            raise ValueError
        report = json.loads(BASELINE.read_bytes())
        payload = report["payload"]
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        signature = hmac.new(
            settings.facade_secret.get_secret_value().encode(), encoded.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, report["signature"]):
            raise ValueError
        if Path(payload["workspace"]).resolve() != BACKEND_ROOT.parent.resolve():
            raise ValueError
        identities = payload["identities"]
        if set(identities) != set(NAMES):
            raise ValueError
        oids, clusters = set(), set()
        for name in NAMES:
            identity = identities[name]
            if identity["name"] != name or type(identity["oid"]) is not int:
                raise ValueError
            if not 0 < identity["oid"] < 2**32 or not str(identity["cluster"]).isdigit():
                raise ValueError
            oids.add(identity["oid"])
            clusters.add(identity["cluster"])
        if len(oids) != 4 or len(clusters) != 1:
            raise ValueError
        for value, name in zip(
            (
                settings.database_url,
                settings.test_database_url,
                settings.benchmark_database_url,
                settings.recovery_database_url,
            ),
            NAMES,
            strict=True,
        ):
            url = make_url(value.get_secret_value())
            if url.host != "127.0.0.1" or url.port != 5433 or url.database != name:
                raise ValueError
        if settings.app_environment != "recovery" or asdict(observed) != identities[NAMES[-1]]:
            raise ValueError
    except KeyError, TypeError, ValueError, OSError:
        raise RuntimeError("CI_RECOVERY_IDENTITY_REFUSED") from None
