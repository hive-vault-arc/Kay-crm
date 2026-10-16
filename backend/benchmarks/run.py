"""Own the exact benchmark API/Locust process trees and preserve unrelated services."""

import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
from sqlalchemy import text

from app.db.isolation import assert_isolated, resolve_identity
from app.db.session import Database
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings
from benchmarks.dataset import ROOT


def main() -> None:
    require_venv()
    settings = load_settings()
    if settings.app_environment != "benchmark":
        raise SystemExit("BENCHMARK_ENVIRONMENT_REQUIRED")
    identity = assert_isolated(settings)
    database = Database(settings.selected_database_url())
    server = None
    try:
        with database.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as lease:
            if not lease.scalar(text("SELECT pg_try_advisory_lock(51505022)")):
                raise RuntimeError("BENCHMARK_ALREADY_ACTIVE")
            with database.engine.connect() as connection:
                counts = [
                    connection.scalar(text(query))
                    for query in (
                        'SELECT count(*) FROM "user"',
                        "SELECT count(*) FROM contact",
                        "SELECT count(*) FROM property",
                    )
                ]
                if counts != [100, 200000, 20000] or resolve_identity(database.engine) != identity:
                    raise RuntimeError("FULL_BENCHMARK_DATASET_REQUIRED")
            for family, kind, protocol, _, address in socket.getaddrinfo(
                "localhost", 8200, type=socket.SOCK_STREAM
            ):
                if address[0] not in {"127.0.0.1", "::1"}:
                    raise RuntimeError("BENCHMARK_TARGET_REFUSED")
                with socket.socket(family, kind, protocol) as probe:
                    probe.settimeout(0.2)
                    if probe.connect_ex(address) == 0:
                        raise RuntimeError("BENCHMARK_PORT_IN_USE")
            server = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "app.cli.serve",
                    "--environment",
                    "benchmark",
                    "--workers",
                    "4",
                    "--port",
                    "8200",
                ],
                cwd=BACKEND_ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env={**os.environ, "APP_ENVIRONMENT": "benchmark", "KAY_BENCHMARK_WORKERS": "4"},
                creationflags=subprocess.CREATE_NO_WINDOW,
            )  # noqa: S603
            ca = BACKEND_ROOT / ".local-data/certificates/ca.pem"
            import ssl

            context = ssl.create_default_context(cafile=str(ca))
            with httpx.Client(verify=context, trust_env=False, timeout=1) as client:
                deadline = time.monotonic() + 20
                while True:
                    if server.poll() is not None or time.monotonic() > deadline:
                        raise RuntimeError("BENCHMARK_API_START_FAILED")
                    try:
                        if (
                            client.get("https://localhost:8200/api/v1/health/live").status_code
                            == 200
                        ):
                            break
                    except httpx.HTTPError:
                        pass
                    time.sleep(0.1)
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "locust",
                    "-f",
                    "benchmarks/locustfile.py",
                    "--headless",
                    "--users",
                    "100",
                    "--spawn-rate",
                    "10",
                    "--run-time",
                    "180s",
                    "--stop-timeout",
                    "10",
                    "--only-summary",
                    "--loglevel",
                    "WARNING",
                ],
                cwd=BACKEND_ROOT,
                env={**os.environ, "APP_ENVIRONMENT": "benchmark", "KAY_BENCHMARK_WORKERS": "4"},
                timeout=200,
                capture_output=True,
                text=True,
            )  # noqa: S603
            for line in result.stdout.splitlines():
                if line.startswith(("SP22_STEADY_BEGIN", "SP22_LOAD_RESULT")):
                    print(line, flush=True)
            if result.returncode:
                raise RuntimeError("BENCHMARK_LOAD_GATE_FAILED")
            report = json.loads((ROOT / "latest-result.json").read_bytes())
            if not report["passed"]:
                raise RuntimeError("BENCHMARK_LOAD_GATE_FAILED")
    except Exception as failure:
        code = str(failure)
        allowed = {
            "BENCHMARK_ALREADY_ACTIVE",
            "FULL_BENCHMARK_DATASET_REQUIRED",
            "BENCHMARK_API_START_FAILED",
            "BENCHMARK_LOAD_GATE_FAILED",
            "BENCHMARK_PORT_IN_USE",
            "BENCHMARK_TARGET_REFUSED",
        }
        raise SystemExit(code if code in allowed else "BENCHMARK_EXECUTION_FAILED") from None
    finally:
        if server is not None and server.poll() is None:
            binary = Path(os.environ["SystemRoot"]) / "System32/taskkill.exe"
            subprocess.run(  # noqa: S603 - fixed system binary and exact owned child PID.
                [str(binary), "/PID", str(server.pid), "/T", "/F"],
                capture_output=True,
                check=False,
                timeout=10,
            )  # noqa: S603
            server.wait(timeout=10)
        database.close()


if __name__ == "__main__":
    main()
