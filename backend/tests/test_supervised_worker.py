"""The readiness observer must delegate real admission and preserve the worker entrypoint."""

from tests import supervised_worker


def test_worker_readiness_observes_but_never_grants_admission(monkeypatch, capsys):
    calls = []
    results = iter([False, True, True])

    def original(admission):
        calls.append(admission)
        return next(results)

    monkeypatch.setattr(supervised_worker.Admission, "enter", original)
    admission = object.__new__(supervised_worker.Admission)

    def real_entrypoint():
        assert admission.enter() is False
        assert admission.enter() is True
        assert admission.enter() is True

    monkeypatch.setattr(supervised_worker, "worker_main", real_entrypoint)
    supervised_worker.main()
    assert calls == [admission] * 3
    captured = capsys.readouterr()
    assert captured.out == "KAY_TEST_WORKER_READY\n"
    assert captured.err == "KAY_TEST_WORKER_CYCLE\n" * 2
    assert supervised_worker.Admission.enter is original
