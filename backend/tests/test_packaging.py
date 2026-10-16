"""Buildpack metadata must reuse the approved runtime and dependency lock."""

import re
import tomllib

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
