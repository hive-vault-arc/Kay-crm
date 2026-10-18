"""Only the module path determines whether a parameterized test is a reviewed unit."""

import pytest

from tests.unit_selection import is_unit


@pytest.mark.parametrize(
    "nodeid,expected",
    [
        ("tests/test_antivirus_settings.py::test_protocol[ClamAV/123/synthetic]", True),
        (r"tests\test_antivirus_settings.py::test_protocol[ClamAV/123/synthetic]", True),
        ("tests/test_qualification_unit.py::test_budget[1250/unsupported]", True),
        ("tests/test_foundation.py::test_runtime_is_project_venv", True),
        ("tests/test_foundation.py::test_unreviewed[test_runtime.py]", False),
        ("tests/test_contacts.py::test_private[tests/test_runtime.py]", False),
    ],
)
def test_module_allowlist_does_not_parse_parameter_values_as_paths(nodeid, expected):
    assert is_unit(nodeid) is expected
