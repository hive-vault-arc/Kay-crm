"""Exercise real Linux managed-prefix Uvicorn startup without a database or secrets."""

import json
import os
import secrets
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main() -> None:
    backend = Path(__file__).resolve().parents[2] / "backend"
    if (
        sys.platform != "linux"
        or sys.version_info[:3] != (3, 14, 3)
        or Path(sys.prefix).resolve() != (backend / ".heroku" / "python").resolve()
    ):
        raise RuntimeError("MANAGED_PYTHON_3_14_3_REQUIRED")
    environment = os.environ.copy()
    certificate = backend / "config" / "ca" / "digitalocean-postgres-ca.crt"
    database = (
        "postgresql://synthetic:synthetic-probe@kay-postgres.synthetic.invalid:25060/kay_runtime_probe"
        f"?sslmode=verify-full&sslrootcert={certificate}"
    )
    for variable in ("TEST_DATABASE_URL", "BENCHMARK_DATABASE_URL", "RECOVERY_DATABASE_URL"):
        environment.pop(variable, None)
    facade = secrets.token_hex(32)
    environment.update(
        APP_ENVIRONMENT="production",
        PRODUCTION_DATABASE_HOST="kay-postgres.synthetic.invalid",
        DATABASE_URL=database,
        FACADE_SECRET=facade,
        FRONTEND_ORIGIN="https://kay.synthetic.invalid",
        ANTIVIRUS_HOST="kay-clamav.synthetic.invalid",
        ANTIVIRUS_PORT="3310",
        PYTHONWARNINGS="error",
    )
    worker = subprocess.run(  # noqa: S603 - fixed isolated probe, pinned managed interpreter.
        [sys.executable, str(Path(__file__).with_name("worker-ca-smoke.py"))],
        cwd=backend,
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    if worker.returncode != 0 or worker.stderr:
        raise RuntimeError("WORKER_CA_PROBE_FAILED")
    print(worker.stdout.strip())
    bootstrap = subprocess.run(  # noqa: S603 - fixed entry point, no secret input or database call.
        [sys.executable, str(backend / "create_first_admin.py")],
        cwd=backend,
        env=environment,
        input="",
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    if (
        bootstrap.returncode != 2
        or not bootstrap.stdout.startswith("TTY_REQUIRED:")
        or bootstrap.stderr
    ):
        raise RuntimeError("FIRST_ADMIN_TTY_GUARD_FAILED")
    with socket.socket() as available:
        available.bind(("127.0.0.1", 0))
        port = available.getsockname()[1]
    environment["PORT"] = str(port)
    command = ["/bin/sh", str(backend / "scripts" / "start-api.sh")]
    process = subprocess.Popen(  # noqa: S603 - fixed managed launcher, isolated CI only.
        command,
        cwd=backend,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        deadline = time.monotonic() + 30
        while True:
            if process.poll() is not None:
                raise RuntimeError("MANAGED_UVICORN_STARTUP_FAILED")
            try:
                # Fixed loopback address; only this disposable process owns the chosen port.
                with urlopen(f"http://127.0.0.1:{port}/api/v1/health/live", timeout=1) as response:  # noqa: S310
                    if response.status != 200 or json.load(response) != {"status": "live"}:
                        raise RuntimeError("MANAGED_LIVENESS_FAILED")
                break
            except URLError, TimeoutError:
                if time.monotonic() >= deadline:
                    raise RuntimeError("MANAGED_UVICORN_STARTUP_TIMEOUT") from None
                time.sleep(0.1)
        try:
            request = Request(
                f"http://127.0.0.1:{port}/api/v1/health/ready",
                headers={"X-Kay-Facade-Secret": facade},
            )
            with urlopen(request, timeout=5):  # noqa: S310 - fixed disposable loopback process.
                raise RuntimeError("UNAVAILABLE_DATABASE_MUST_NOT_REPORT_READY")
        except HTTPError as failure:
            with failure:
                if failure.code != 503:
                    raise RuntimeError("UNAVAILABLE_DATABASE_DID_NOT_FAIL_CLOSED") from None
    finally:
        process.terminate()
        try:
            output, _ = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.communicate(timeout=5)
            raise RuntimeError("MANAGED_UVICORN_SHUTDOWN_TIMEOUT") from None
    if (
        process.returncode not in (0, -signal.SIGTERM)
        or "Application shutdown complete." not in output
        or f"POSTGRES_CA_OK: sslrootcert={certificate}" not in output
        or any(word in output.lower() for word in ("warning", "traceback", "error"))
    ):
        raise RuntimeError("MANAGED_UVICORN_DIAGNOSTICS_FAILED")
    print(
        "Production-mode Linux Python: bundled CA/first-admin TTY guard/"
        "startup/live200/shutdown pass; "
        "synthetic unavailable DB503."
    )


if __name__ == "__main__":
    main()
