"""Production scanner configuration and fail-closed transport, without network access."""

import secrets
import socket
from contextlib import nullcontext
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.files.scanner import scan
from app.identity.security import IdentityError
from app.settings import ConfigurationError, Settings, load_settings


@pytest.fixture(autouse=True)
def synthetic_configuration(monkeypatch):
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    for field in Settings.model_fields:
        monkeypatch.delenv(field.upper(), raising=False)
    monkeypatch.setenv("APP_ENVIRONMENT", "production")
    monkeypatch.setenv("PRODUCTION_DATABASE_HOST", "kay-postgres.synthetic.invalid")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://synthetic:synthetic-value@kay-postgres.synthetic.invalid:25060/"
        "kay_crm?sslmode=verify-full&sslrootcert=system",
    )
    monkeypatch.setenv("FACADE_SECRET", secrets.token_hex(32))
    monkeypatch.setenv("FRONTEND_ORIGIN", "https://kay.synthetic.invalid")

    def refused(*args, **kwargs):
        pytest.fail("NETWORK_FORBIDDEN_IN_SCANNER_CONFIGURATION_TEST")

    monkeypatch.setattr(socket, "create_connection", refused)
    monkeypatch.setattr(socket, "getaddrinfo", refused)


@pytest.mark.parametrize(
    "host,expected",
    [
        ("kay-clamav", "kay-clamav"),
        ("clamav.internal", "clamav.internal"),
        ("KAY-CLAMAV.SYNTHETIC.INVALID", "kay-clamav.synthetic.invalid"),
        ("clamav.synthetic.invalid.", "clamav.synthetic.invalid."),
        ("127.0.0.1", "127.0.0.1"),
        ("10.20.30.40", "10.20.30.40"),
        ("::1", "::1"),
        ("fd00::3310", "fd00::3310"),
    ],
)
def test_production_accepts_configured_dns_and_ip_without_resolution(monkeypatch, host, expected):
    monkeypatch.setenv("ANTIVIRUS_HOST", host)
    settings = load_settings()
    assert settings.antivirus_host == expected and settings.antivirus_port == 3310


@pytest.mark.parametrize(
    "environment", ["development", "production", "test", "benchmark", "recovery"]
)
def test_default_scanner_endpoint_is_unchanged(monkeypatch, environment):
    monkeypatch.setenv("APP_ENVIRONMENT", environment)
    if environment != "production":
        local_url = "postgresql+psycopg://synthetic@127.0.0.1:1/kay_development"
        monkeypatch.setenv("DATABASE_URL", local_url)
        if environment != "development":
            monkeypatch.setenv(f"{environment.upper()}_DATABASE_URL", local_url)
    settings = load_settings()
    assert (settings.antivirus_host, settings.antivirus_port) == ("127.0.0.1", 3310)
    if environment != "production":
        monkeypatch.setenv("ANTIVIRUS_HOST", "clamav.synthetic.invalid")
        with pytest.raises(ConfigurationError, match="ANTIVIRUS_HOST:LOCAL_ANTIVIRUS_REQUIRED"):
            load_settings()


@pytest.mark.parametrize(
    "host",
    [
        "",
        " ",
        "clamav.internal ",
        "https://clamav.internal",
        "tcp://clamav.internal:3310",
        "clamav.internal:3310",
        "private-marker@clamav.internal",
        "clamav.internal/path",
        "clamav.internal?secret=private-marker",
        "clamav.internal#fragment",
        "clamav..internal",
        "-clamav.internal",
        "clamav-.internal",
        "clam_av.internal",
        "[fd00::3310]",
        "fe80::1%private-marker",
        "clamav\n.internal",
        "clamav\0.internal",
        "a" * 64 + ".internal",
        ".".join(["a" * 63] * 4),
    ],
)
def test_bad_scanner_host_reports_only_variable_and_code(monkeypatch, host):
    # NUL cannot be an OS environment value; test that input directly instead.
    if "\0" in host:
        with pytest.raises(ValidationError, match="HOST_INVALID"):
            Settings(antivirus_host=host)
        return
    monkeypatch.setenv("ANTIVIRUS_HOST", host)
    with pytest.raises(ConfigurationError) as failure:
        load_settings()
    assert str(failure.value) == "CONFIGURATION_INVALID: ANTIVIRUS_HOST:HOST_INVALID"
    assert failure.value.__suppress_context__
    with pytest.raises(ValidationError) as raw:
        Settings()
    assert "private-marker" not in str(raw.value)


@pytest.mark.parametrize("port", ["0", "65536", "private-marker"])
def test_invalid_scanner_ports_still_fail_without_value_disclosure(monkeypatch, port):
    monkeypatch.setenv("ANTIVIRUS_PORT", port)
    with pytest.raises(ConfigurationError) as failure:
        load_settings()
    assert "ANTIVIRUS_PORT:" in str(failure.value)
    assert "private-marker" not in str(failure.value)


@pytest.mark.parametrize("failure", [socket.gaierror, ConnectionRefusedError, TimeoutError])
def test_private_scanner_connection_failures_are_never_clean(monkeypatch, failure):
    monkeypatch.setenv("ANTIVIRUS_HOST", "kay-clamav.synthetic.invalid")
    settings = load_settings()
    attempted = []

    def unavailable(endpoint, *, timeout):
        attempted.append(endpoint)
        assert timeout == 20
        raise failure("private-marker")

    monkeypatch.setattr(socket, "create_connection", unavailable)
    with pytest.raises(IdentityError) as error:
        scan(settings, b"synthetic bytes")
    assert attempted == [("kay-clamav.synthetic.invalid", 3310)]
    assert error.value.code == "ANTIVIRUS_UNAVAILABLE" and error.value.status == 503
    assert "private-marker" not in str(error.value)


@pytest.mark.parametrize(
    "version,verdict,expected",
    [
        (b"ClamAV 1.5.4/12345/synthetic\0", b"stream: OK\0", "clean"),
        (b"ClamAV 1.5.4/12345/synthetic\0", b"stream: Synthetic FOUND\0", "rejected"),
        (b"ClamAV 1.5.4/12345/synthetic\0", b"stream: ERROR\0", None),
        (b"ClamAV 1.5.4/12345/synthetic\0", b"truncated", None),
        (b"ClamAV 1.5.4/no-signatures/synthetic\0", b"stream: OK\0", None),
        (b"not-clamav\0", b"stream: OK\0", None),
    ],
)
def test_private_endpoint_keeps_stream_protocol_and_verdicts(
    monkeypatch, version, verdict, expected
):
    monkeypatch.setenv("ANTIVIRUS_HOST", "kay-clamav.synthetic.invalid")
    monkeypatch.setenv("ANTIVIRUS_PORT", "3331")
    settings = load_settings()
    replies, attempted, sent = iter([version, verdict]), [], []

    def connection(endpoint, *, timeout):
        attempted.append(endpoint)
        assert endpoint == ("kay-clamav.synthetic.invalid", 3331) and timeout == 20
        response = iter([next(replies), b""])
        return nullcontext(SimpleNamespace(sendall=sent.append, recv=lambda size: next(response)))

    monkeypatch.setattr(socket, "create_connection", connection)
    if expected:
        result, signature = scan(settings, b"synthetic bytes")
        assert result == expected and signature.startswith("ClamAV ")
        assert len(attempted) == 2
        assert sent == [b"zVERSION\0", b"zINSTREAM\0", b"\0\0\0\x0f", b"synthetic bytes", b"\0" * 4]
    else:
        with pytest.raises(IdentityError, match="ANTIVIRUS_UNAVAILABLE") as error:
            scan(settings, b"synthetic bytes")
        assert error.value.status == 503
