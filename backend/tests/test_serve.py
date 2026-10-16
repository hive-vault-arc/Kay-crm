"""Bound local process counts without substituting benchmark-only application code."""

import sys

import pytest
from fastapi import FastAPI
from uvicorn.config import Config
from uvicorn.importer import import_from_string

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


def test_standard_uvicorn_import_target_is_an_app_without_an_import_time_connection():
    application = import_from_string("app.main:app")
    assert isinstance(application, FastAPI)
    assert not hasattr(application.state, "database")
    assert application.docs_url is None and application.openapi_url is None


def test_standard_uvicorn_target_does_not_need_factory_detection_or_replace_the_factory(caplog):
    config = Config("app.main:app", log_level="warning", access_log=False)
    config.load()
    assert not config.factory
    assert config.loaded_app is not None
    assert "factory detected" not in caplog.text.lower()
    exported = import_from_string("app.main:app")
    constructed = serve.create_app()
    assert constructed is not exported
    assert [getattr(route, "path", None) for route in constructed.routes] == [
        getattr(route, "path", None) for route in exported.routes
    ]
    assert [middleware.cls for middleware in constructed.user_middleware] == [
        middleware.cls for middleware in exported.user_middleware
    ]


@pytest.mark.parametrize("workers", [0, 5])
def test_worker_count_outside_local_resource_bound_is_rejected(monkeypatch, workers):
    monkeypatch.setattr(sys, "argv", ["serve", "--workers", str(workers)])
    with pytest.raises(SystemExit) as failure:
        serve.main()
    assert failure.value.code == 2
