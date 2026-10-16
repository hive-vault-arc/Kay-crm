"""Cleanup must reject altered, aliased or foreign CI identity baselines before DDL."""

import json
import secrets

import pytest
from pydantic import SecretStr

from app.db.isolation import DatabaseIdentity
from app.runtime import BACKEND_ROOT
from tests import ci_identity


@pytest.fixture
def ci_target(settings, monkeypatch, tmp_path):
    key = secrets.token_urlsafe(48)
    updates = {"app_environment": "recovery", "facade_secret": SecretStr(key)}
    for field, name in zip(
        ("database_url", "test_database_url", "benchmark_database_url", "recovery_database_url"),
        ci_identity.NAMES,
        strict=True,
    ):
        updates[field] = SecretStr(f"postgresql+psycopg://postgres@127.0.0.1:5433/{name}")
    target = settings.model_copy(update=updates)
    identities = {
        name: {"name": name, "oid": 20000 + i, "cluster": "1234567890123456789"}
        for i, name in enumerate(ci_identity.NAMES)
    }
    baseline = tmp_path / "identities.json"
    baseline.write_text(ci_identity.signed_baseline(identities, key), encoding="utf8")
    monkeypatch.setattr(ci_identity, "BASELINE", baseline)
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.setenv("CI", "true")
    monkeypatch.setenv("GITHUB_WORKSPACE", str(BACKEND_ROOT.parent))
    observed = DatabaseIdentity(**identities[ci_identity.NAMES[-1]])
    return target, identities, key, observed, baseline


def test_exact_preprovisioned_ci_identity_is_accepted(ci_target):
    target, _, _, observed, _ = ci_target
    ci_identity.require_recovery_identity(target, observed)


@pytest.mark.parametrize(
    "change", ["signature", "alias", "workspace", "missing", "port", "observed"]
)
def test_ci_cleanup_refuses_unverified_target(ci_target, monkeypatch, change):
    target, identities, key, observed, baseline = ci_target
    if change == "signature":
        report = json.loads(baseline.read_text())
        report["payload"]["identities"][ci_identity.NAMES[-1]]["oid"] += 1
        baseline.write_text(json.dumps(report), encoding="utf8")
    elif change == "alias":
        identities[ci_identity.NAMES[-1]]["oid"] = identities[ci_identity.NAMES[0]]["oid"]
        baseline.write_text(ci_identity.signed_baseline(identities, key), encoding="utf8")
        observed = DatabaseIdentity(**identities[ci_identity.NAMES[-1]])
    elif change == "workspace":
        monkeypatch.setenv("GITHUB_WORKSPACE", str(BACKEND_ROOT))
    elif change == "missing":
        baseline.unlink()
    elif change == "port":
        target = target.model_copy(
            update={
                "recovery_database_url": SecretStr(
                    "postgresql+psycopg://postgres@127.0.0.1:5432/kayrealestate_recovery"
                )
            }
        )
    else:
        observed = DatabaseIdentity(observed.cluster, observed.oid + 1, observed.name)
    with pytest.raises(RuntimeError, match="CI_RECOVERY_IDENTITY_REFUSED"):
        ci_identity.require_recovery_identity(target, observed)


def test_fixed_workstation_identity_remains_mandatory(settings, monkeypatch):
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    ci_identity.require_recovery_identity(settings, ci_identity.LOCAL_RECOVERY)
    with pytest.raises(RuntimeError, match="LOCAL_RECOVERY_IDENTITY_REFUSED"):
        ci_identity.require_recovery_identity(
            settings, DatabaseIdentity("1234567890123456789", 20003, "kayrealestate_recovery")
        )
