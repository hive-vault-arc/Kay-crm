"""Local HTTPS entry point with pinned runtime and safe startup failures."""

import argparse
import os
import sys

import uvicorn

from app.main import create_app
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings


def main() -> None:
    """Bind only loopback and share the ignored certificate with Next.js."""
    require_venv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=1)
    parser.add_argument(
        "--environment",
        choices=["development", "test", "benchmark", "recovery"],
        default="development",
    )
    arguments = parser.parse_args()
    os.environ["APP_ENVIRONMENT"] = arguments.environment
    try:
        settings = load_settings()
        application = "app.main:create_app" if arguments.workers > 1 else create_app(settings)
        certificate = BACKEND_ROOT / ".local-data" / "certificates"
        uvicorn.run(
            application,
            factory=arguments.workers > 1,
            workers=arguments.workers,
            loop="app.runtime:create_server_loop" if sys.platform == "win32" else "auto",
            host="localhost",
            port=arguments.port,
            ssl_keyfile=str(certificate / "localhost-key.pem"),
            ssl_certfile=str(certificate / "localhost.pem"),
            access_log=False,
            log_level="warning",
        )
    except Exception:
        print("API_START_FAILED: check local configuration, database and certificate setup.")
        sys.exit(1)


if __name__ == "__main__":
    main()
