"""Keep exact legacy/current synthetic distributions without reseeding records."""

import pytest

from benchmarks.dataset import expected_enquiries


@pytest.mark.parametrize("position", [0, 9, 10, 29, 30, 99])
@pytest.mark.parametrize("converted", [False, True])
def test_fixed_synthetic_enquiry_totals(position, converted):
    counts = {"new": 180000, "converted": 20000} if converted else {"new": 200000}
    expected = (
        (180000 if converted else 200000)
        if position < 10
        else 2000
        if converted
        else 2223
        if position < 30
        else 2222
    )
    assert expected_enquiries(position, counts) == expected


@pytest.mark.parametrize(
    "position,counts",
    [(-1, {"new": 200000}), (100, {"new": 200000}), (10, {}), (10, {"new": 199999})],
)
def test_unknown_benchmark_distributions_fail_closed(position, counts):
    with pytest.raises(RuntimeError, match="BENCHMARK_ENQUIRY_DISTRIBUTION_REFUSED"):
        expected_enquiries(position, counts)
