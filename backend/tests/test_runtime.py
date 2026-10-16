"""Managed application startup must not weaken local operator-tool isolation."""

import runpy
import sys

import pytest

from app import runtime


@pytest.mark.parametrize("environment", ["production", "development", "test", "recovery"])
def test_managed_operator_runtime_requires_explicit_production(monkeypatch, environment):
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    monkeypatch.setenv("APP_ENVIRONMENT", environment)
    if environment == "production":
        runtime.require_operator_runtime()
    else:
        with pytest.raises(RuntimeError, match="backend/.venv"):
            runtime.require_operator_runtime()


def test_managed_production_does_not_authorize_local_setup_or_probe_tools(monkeypatch):
    from app.cli import inspect_database, serve, setup_local, smoke

    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    monkeypatch.setenv("APP_ENVIRONMENT", "production")
    for module in (inspect_database, serve, setup_local, smoke):
        with pytest.raises(RuntimeError, match="backend/.venv"):
            module.main()


def test_package_import_accepts_pinned_linux_buildpack(monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    runpy.run_path(str(runtime.BACKEND_ROOT / "app" / "__init__.py"))


def test_local_application_runtime_is_still_supported():
    runtime.require_runtime()
    runtime.require_venv()


@pytest.mark.parametrize("platform", ["win32", "darwin"])
def test_buildpack_path_is_not_an_escape_on_other_platforms(monkeypatch, platform):
    monkeypatch.setattr(sys, "platform", platform)
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    with pytest.raises(RuntimeError, match="Python 3.14.3"):
        runtime.require_runtime()


@pytest.mark.parametrize("version", [(3, 14, 2), (3, 14, 4), (3, 13, 12)])
@pytest.mark.parametrize("managed", [False, True])
def test_wrong_python_patch_fails_in_both_runtimes(monkeypatch, version, managed):
    monkeypatch.setattr(sys, "version_info", version)
    if managed:
        monkeypatch.setattr(sys, "platform", "linux")
        monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    with pytest.raises(RuntimeError, match="Python 3.14.3"):
        runtime.require_runtime()


@pytest.mark.parametrize("suffix", ["", ".heroku/other", ".heroku/python-copy", "other/.venv"])
def test_global_or_unrelated_interpreters_are_rejected(monkeypatch, suffix):
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / suffix))
    with pytest.raises(RuntimeError, match="Python 3.14.3"):
        runtime.require_runtime()


def test_managed_application_does_not_authorize_local_operator_tools(monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(sys, "prefix", str(runtime.BACKEND_ROOT / ".heroku" / "python"))
    with pytest.raises(RuntimeError, match="backend/.venv"):
        runtime.require_venv()
    with pytest.raises(RuntimeError, match="backend/.venv"):
        runpy.run_path(str(runtime.BACKEND_ROOT / "app" / "cli" / "__init__.py"))
