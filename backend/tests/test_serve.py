"""Bound local process counts without substituting benchmark-only application code."""

import sys

import pytest

from app.cli import serve
from app.runtime import create_server_loop


@pytest.mark.parametrize("workers", [1, 4])
def test_local_worker_configuration_keeps_loopback_tls_and_real_factory(monkeypatch, workers):
    monkeypatch.setenv("APP_ENVIRONMENT", "test")
    monkeypatch.setattr(
        sys, "argv", ["serve", "--environment", "test", "--port", "8200", "--workers", str(workers)]
    )
    settings, application = object(), object()
    constructed, calls = [], []
    monkeypatch.setattr(serve, "load_settings", lambda: settings)

    def create(config):
        assert config is settings
        constructed.append(True)
        return application

    monkeypatch.setattr(serve, "create_app", create)
    monkeypatch.setattr(
        serve.uvicorn, "run", lambda target, **options: calls.append((target, options))
    )
    serve.main()
    target, options = calls[0]
    assert target == "app.main:create_app" if workers == 4 else target is application
    assert constructed == ([] if workers == 4 else [True])
    assert options["workers"] == workers and options["factory"] is (workers > 1)
    assert options["host"] == "localhost" and options["port"] == 8200
    assert options["ssl_keyfile"].endswith("localhost-key.pem")
    assert options["ssl_certfile"].endswith("localhost.pem")
    assert options["access_log"] is False
    assert options["loop"] == (
        "app.runtime:create_server_loop" if sys.platform == "win32" else "auto"
    )


def test_http_loop_factory_is_socket_selector_without_changing_global_policy():
    import asyncio

    loop = create_server_loop()
    try:
        assert isinstance(loop, asyncio.SelectorEventLoop)
        assert not loop.is_running()
    finally:
        loop.close()


@pytest.mark.parametrize("workers", [0, 5])
def test_worker_count_outside_local_resource_bound_is_rejected(monkeypatch, workers):
    monkeypatch.setattr(sys, "argv", ["serve", "--workers", str(workers)])
    with pytest.raises(SystemExit) as failure:
        serve.main()
    assert failure.value.code == 2
