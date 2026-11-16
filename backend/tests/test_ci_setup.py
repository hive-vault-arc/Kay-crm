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
