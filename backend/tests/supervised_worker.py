"""Observe real worker admission readiness without changing its loop or verdicts."""

from app.cli.worker import main as worker_main
from app.recovery.maintenance import Admission


def main() -> None:
    original = Admission.enter
    announced = False

    def observed(admission: Admission) -> bool:
        nonlocal announced
        admitted = original(admission)
        if admitted and not announced:
            print("KAY_TEST_WORKER_READY", flush=True)
            announced = True
        return admitted

    Admission.enter = observed
    try:
        worker_main()
    finally:
        Admission.enter = original


if __name__ == "__main__":
    main()
