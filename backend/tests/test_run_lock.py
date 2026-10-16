"""A second writer fails before fixture cleanup or application startup."""

import pytest

from app.settings import Settings
from tests.run_lock import exclusive_test_run


def test_second_isolated_writer_is_refused(settings: Settings) -> None:
    with pytest.raises(RuntimeError, match="ISOLATED_TEST_RUN_ALREADY_ACTIVE"):
        with exclusive_test_run(settings):
            raise AssertionError("SECOND_WRITER_ENTERED")
