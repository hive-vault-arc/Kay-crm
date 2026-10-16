# Production private ClamAV configuration

2026-10-16. Owner-requested repair of `ANTIVIRUS_HOST` validation and source
publication. The previous unconditional loopback literal rejected valid production
DNS settings before either API or worker could start.

## Configuration

Set both API and worker components privately with:

```dotenv
APP_ENVIRONMENT=production
ANTIVIRUS_HOST=your-private-clamav-service-name
ANTIVIRUS_PORT=3310
```

The host above is an explicit placeholder: use the existing private service's DNS
name and actual ClamD TCP port. Single-label names, qualified DNS names and IP
addresses are supported in production. Use a bare hostname, not `http://`,
`tcp://`, a URL, a credential, `host:port` or an IPv6 bracket wrapper. DNS labels
must be valid ASCII labels of at most63 characters, total at most253. Ports remain
1–65535. No DNS resolution or scanner connection occurs during settings loading.
Invalid settings expose only known variable/error codes, for example
`CONFIGURATION_INVALID: ANTIVIRUS_HOST:HOST_INVALID`.

Unconfigured defaults remain `127.0.0.1:3310`. Development, test, benchmark and
recovery retain the existing loopback restriction. The managed PostgreSQL exact
host, verified TLS/root certificate, environment isolation, migration guards and
authorization are unchanged. No other production setting is relaxed by this fix.

The existing scanner uses ClamD VERSION/INSTREAM TCP, not HTTP. Keep this service
on a trusted private network with restricted ingress; this patch does not add
scanner transport encryption, authentication or infrastructure. Only the real
configured scanner can yield a clean verdict. Infection remains rejected, while
unavailable DNS, refused connections, timeout, invalid signatures or malformed
protocol retain `ANTIVIRUS_UNAVAILABLE`503 and the existing quarantine/retry rules.

## Verification

Actual local commands from `backend/`, pinned explicit venv:

```powershell
./scripts/kay.ps1 -Task check
.venv/Scripts/python.exe -m tests.unit_runner
.venv/Scripts/python.exe -m ruff check ../.github/scripts/buildpack-smoke.py ../.github/scripts/worker-ca-smoke.py
.venv/Scripts/python.exe -m ruff format --check ../.github/scripts/buildpack-smoke.py ../.github/scripts/worker-ca-smoke.py
```

Quality: Ruff and formatting pass, 301 files; strict mypy passes178 modules.
Units: **154 passed,513 deselected in6.92s**. The reviewed unit runner forbids
real database connections before collection and does not load workstation dotenv.
New scanner tests additionally forbid real scanner sockets/DNS. Production API
lifespan and worker entrypoint configuration use synthetic private scanner DNS
with both supported database CA configurations, without touching production.
Controlled transport tests cover clean, infected, unavailable and malformed
responses; these are unit checks, not a real ClamAV integration result.

The existing automatic Linux managed-runtime probe now explicitly sets synthetic
private scanner DNS for API and worker configuration, preserving real Uvicorn
startup/liveness/shutdown and fail-closed unavailable synthetic database readiness.
Its hosted run and the other required CI jobs must pass before main merge.
No workflow scheduling, required-job policy or branch protection is changed.

Complete manual database/browser/real-scanner integration is **not executed,
not passed** for this patch and remains required on disposable synthetic targets
before release with real customer data, never production. Actual DigitalOcean
endpoint resolution/reachability and live scanning are not verified by this task.
No production database connection, private file transfer or infrastructure change.
