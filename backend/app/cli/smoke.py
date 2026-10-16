"""Verify actual HTTPS, CA enforcement and safe health responses on the local API."""

import ssl

import httpx

from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings


def main() -> None:
    """Use HTTPX with explicit local CA, never a global verification bypass."""
    require_venv()
    settings = load_settings()
    authority = BACKEND_ROOT / ".local-data/certificates/ca.pem"
    context = ssl.create_default_context(cafile=str(authority))
    with httpx.Client(
        base_url="https://localhost:8000", verify=context, timeout=10, trust_env=False
    ) as client:
        live = client.get("/api/v1/health/live")
        denied = client.get("/api/v1/health/ready")
        ready = client.get(
            "/api/v1/health/ready",
            headers={
                "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
            },
        )
        if live.json() != {"status": "live"} or denied.status_code != 403:
            raise RuntimeError("HEALTH_BOUNDARY_FAILED")
        if ready.status_code != 200 or ready.json() != {"status": "ready"}:
            raise RuntimeError("READINESS_FAILED")
        if ready.headers.get("cache-control") != "no-store":
            raise RuntimeError("CACHE_BOUNDARY_FAILED")
    try:
        with httpx.Client(timeout=5, trust_env=False) as untrusted:
            untrusted.get("https://localhost:8000/api/v1/health/live")
    except httpx.ConnectError:
        print(
            "HTTPS smoke passed: explicit CA, live/ready, direct denial, no-store, "
            "untrusted CA refused."
        )
        return
    raise RuntimeError("UNEXPECTED_SYSTEM_CA_TRUST: review this machine's trust configuration")


if __name__ == "__main__":
    main()
