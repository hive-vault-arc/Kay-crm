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
    database = (
        "postgresql://synthetic:synthetic-probe@kay-postgres.synthetic.invalid:25060/kay_runtime_probe"
        "?sslmode=verify-full&sslrootcert=system"
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
        PYTHONWARNINGS="error",
    )
    with socket.socket() as available:
        available.bind(("127.0.0.1", 0))
        port = available.getsockname()[1]
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--no-access-log",
    ]
    process = subprocess.Popen(  # noqa: S603 - pinned interpreter, fixed args, isolated CI only.
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
        or any(word in output.lower() for word in ("warning", "traceback", "error"))
    ):
        raise RuntimeError("MANAGED_UVICORN_DIAGNOSTICS_FAILED")
    print(
        "Production-mode Linux Python: startup/live200/shutdown pass; synthetic unavailable DB503."
    )


if __name__ == "__main__":
    main()
