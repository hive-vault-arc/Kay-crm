"""Start the independently installed copy without copying or printing configuration."""

import json
import os
import subprocess

from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings


def main() -> None:
    require_venv()
    settings = load_settings()
    target = BACKEND_ROOT / ".local-data/acceptance/fresh-backend"
    child_env = {**os.environ, "APP_ENVIRONMENT": "benchmark"}
    for name, value in settings.model_dump().items():
        if name != "app_environment":
            child_env[name.upper()] = str(
                value.get_secret_value() if hasattr(value, "get_secret_value") else value
            )
    program = """
import json
from fastapi.testclient import TestClient
from app.runtime import require_venv
from app.settings import load_settings
from app.main import create_app
require_venv()
settings = load_settings()
with TestClient(create_app(settings)) as client:
    assert client.get('/api/v1/health/live').json() == {'status': 'live'}
    assert client.get('/api/v1/health/ready').status_code == 403
    response = client.get('/api/v1/health/ready', headers={
        'X-Kay-Facade-Secret': settings.facade_secret.get_secret_value()})
    assert response.json() == {'status': 'ready'}
print(json.dumps({'fresh_locked_install': True, 'live': 200,
                  'database_ready': 200, 'anonymous_ready': 403}))
"""
    result = subprocess.run(  # noqa: S603 - fixed isolated installation, no shell.
        [str(target / ".venv/Scripts/python.exe"), "-c", program],
        cwd=target,
        env=child_env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode:
        raise SystemExit("FRESH_INSTALLED_RUNTIME_START_FAILED")
    report = json.loads(result.stdout)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
