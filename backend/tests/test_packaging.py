"""Buildpack metadata must reuse the approved runtime and dependency lock."""

import hashlib
import re
import ssl
import subprocess
import sys
import tomllib

import pytest

from app.runtime import BACKEND_ROOT


def test_standard_requirements_contains_runtime_pins_and_old_entry_point_is_an_alias():
    requirements = (BACKEND_ROOT / "requirements.txt").read_text(encoding="utf-8")
    assert re.search(r"^fastapi==\S+", requirements, re.MULTILINE)
    assert re.search(r"^uvicorn==\S+", requirements, re.MULTILINE)
    assert "--hash=sha256:" in requirements
    assert not any(line.startswith(("-r ", "-e ")) for line in requirements.splitlines())
    lines = [
        line.strip()
        for line in (BACKEND_ROOT / "requirements.lock").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    assert lines == ["--require-hashes", "-r requirements.txt"]


def test_buildpack_python_version_matches_project_and_ci():
    version = (BACKEND_ROOT / ".python-version").read_text(encoding="utf-8").strip()
    with (BACKEND_ROOT / "pyproject.toml").open("rb") as source:
        project = tomllib.load(source)["project"]
    assert project["requires-python"] == f"=={version}"
    assert (BACKEND_ROOT.parent / ".python-version").read_text(encoding="utf-8").strip() == version


def test_runtime_requirements_are_preserved_in_recovery_code_and_compatibility():
    from app.recovery.snapshot import code_paths

    paths = code_paths()
    assert BACKEND_ROOT / "requirements.txt" in paths
    assert BACKEND_ROOT / "requirements.lock" in paths
    assert BACKEND_ROOT / "create_first_admin.py" in paths
    assert BACKEND_ROOT / "config/ca/digitalocean-postgres-ca.crt" in paths
    for name in ("start-api.sh", "start-worker.sh"):
        assert BACKEND_ROOT / "scripts" / name in paths


def test_bundled_ca_is_exactly_the_supplied_public_certificate():
    from app.cli.check_postgres_ca import checked_ca_path

    certificate = checked_ca_path()
    content = certificate.read_text(encoding="ascii")
    digest = hashlib.sha256(ssl.PEM_cert_to_DER_cert(content)).hexdigest()
    assert digest == "fd910223389572486b0ef6936a71b81e1ae4695475a3df7e7deccaeeb8bf1a5c"
    assert content.count("BEGIN CERTIFICATE") == 1
    assert "PRIVATE KEY" not in content


@pytest.mark.parametrize("payload", [b"invalid", b"", b"extra-public-text"])
def test_bundled_ca_rejects_invalid_or_mixed_content(monkeypatch, tmp_path, payload):
    from app.cli import check_postgres_ca

    certificate = tmp_path / "ca.crt"
    certificate.write_bytes(check_postgres_ca.CA_PATH.read_bytes() + payload)
    if not payload:
        certificate.write_bytes(b"invalid")
    monkeypatch.setattr(check_postgres_ca, "CA_PATH", certificate)
    with pytest.raises(RuntimeError) as failure:
        check_postgres_ca.checked_ca_path()
    assert str(failure.value) == "CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID"
    assert failure.value.__suppress_context__


def test_missing_ca_has_only_safe_variable_and_code(monkeypatch, tmp_path, capsys):
    from app.cli import check_postgres_ca

    monkeypatch.setattr(check_postgres_ca, "CA_PATH", tmp_path / "private-marker.crt")
    assert check_postgres_ca.main() == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert output.err == "CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID\n"


def test_permission_denial_is_redacted(monkeypatch, capsys):
    from pathlib import Path

    from app.cli import check_postgres_ca

    def denied(*args):
        raise PermissionError("private-path-marker")

    monkeypatch.setattr(Path, "read_bytes", denied)
    assert check_postgres_ca.main() == 1
    assert capsys.readouterr().err == "CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID\n"


def test_ca_preflight_runs_before_settings_without_database_configuration():
    program = (
        "import sys; from app.cli.check_postgres_ca import main; "
        "assert 'app.settings' not in sys.modules; raise SystemExit(main())"
    )
    result = subprocess.run(  # noqa: S603 - fixed public-file probe, pinned test interpreter.
        [sys.executable, "-c", program],
        cwd=BACKEND_ROOT,
        capture_output=True,
        text=True,
        check=False,
        timeout=10,
    )
    assert result.returncode == 0
    assert result.stderr == ""
    assert result.stdout.strip() == (
        f"POSTGRES_CA_OK: sslrootcert={BACKEND_ROOT / 'config/ca/digitalocean-postgres-ca.crt'}"
    )


@pytest.mark.parametrize(
    "component,module", [("api", "uvicorn app.main:app"), ("worker", "app.cli.worker")]
)
def test_both_managed_launchers_check_ca_before_loading_the_application(component, module):
    launcher = (BACKEND_ROOT / "scripts" / f"start-{component}.sh").read_text(encoding="utf-8")
    assert launcher.index("-m app.cli.check_postgres_ca") < launcher.index(f"-m {module}")
    assert "exec ./.heroku/python/bin/python" in launcher
