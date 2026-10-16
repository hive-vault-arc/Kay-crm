import argparse
import os
import sys

import uvicorn

from app.runtime import BACKEND_ROOT, require_venv


def main() -> None:
    require_venv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment", choices=["development", "test"], default="development")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=3000)
    args = parser.parse_args()
    os.environ["APP_ENVIRONMENT"] = args.environment
    from app.db.isolation import assert_isolated
    from app.intake.configuration import load_key
    from app.intake.simulator import create_simulator
    from app.settings import load_settings

    try:
        settings = load_settings()
        if settings.app_environment != "development":
            assert_isolated(settings)
        load_key(settings)
        certificates = BACKEND_ROOT / ".local-data/certificates"
        uvicorn.run(
            create_simulator(settings, args.port, args.api_port, args.frontend_port),
            host="127.0.0.1",
            loop="app.runtime:create_server_loop" if sys.platform == "win32" else "auto",
            port=args.port,
            ssl_keyfile=str(certificates / "localhost-key.pem"),
            ssl_certfile=str(certificates / "localhost.pem"),
            access_log=False,
            log_level="warning",
        )
    except Exception:
        raise SystemExit("SIMULATOR_START_FAILED: verify source, ports and certificates.") from None


if __name__ == "__main__":
    main()
