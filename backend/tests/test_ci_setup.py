"""CI provisioning must refuse a workstation before touching private configuration."""

import pytest

from tests import ci_setup


@pytest.mark.parametrize("github,ci", [(None, None), ("false", "true"), ("true", "false")])
def test_ci_provisioning_refuses_non_github_process(monkeypatch, github, ci):
    for key, value in (("GITHUB_ACTIONS", github), ("CI", ci)):
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)

    def forbidden_connection(*args, **kwargs):
        pytest.fail("Refused CI setup must not connect to any database")

    monkeypatch.setattr(ci_setup.psycopg, "connect", forbidden_connection)
    with pytest.raises(RuntimeError, match="FRESH_GITHUB_CHECKOUT_REQUIRED"):
        ci_setup.main()


def test_scanner_readiness_requires_clean_and_rejected_verdicts(monkeypatch):
    results = iter([("clean", "ClamAV test"), ("rejected", "ClamAV test")])
    monkeypatch.setattr(ci_setup, "scan", lambda *args: next(results))
    ci_setup.verify_scanner()


def test_scanner_readiness_rejects_false_clean_signature(monkeypatch):
    monkeypatch.setattr(ci_setup, "scan", lambda *args: ("clean", "ClamAV test"))
    with pytest.raises(RuntimeError, match="CI_REAL_SCANNER_VERDICT_FAILED"):
        ci_setup.verify_scanner()


def test_scanner_readiness_has_bounded_unavailability(monkeypatch):
    attempts = []

    def unavailable(*args):
        attempts.append(True)
        raise ci_setup.IdentityError("ANTIVIRUS_UNAVAILABLE", 503)

    monkeypatch.setattr(ci_setup, "scan", unavailable)
    monkeypatch.setattr(ci_setup.time, "sleep", lambda *args: None)
    with pytest.raises(RuntimeError, match="CI_REAL_SCANNER_NOT_READY"):
        ci_setup.verify_scanner()
    assert len(attempts) == 3
