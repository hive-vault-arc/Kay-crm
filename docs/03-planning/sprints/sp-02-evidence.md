# SP-02 execution record

Date: 2026-10-14. Scope: C13/C14, BR-22/24 foundation, AT-23/26 transport variants only.
Status: technically accepted. Product review: pending Khalid; not implied by technical evidence.

## Focused E2E defined before implementation

Actor: visitor to the explicitly labeled local shell; no account, credential entry,
CRM record or privileged business action belongs to this sprint.

1. Open the French shell over local HTTPS and use its existing navigation.
2. The dashboard checks real readiness through same-origin `/api/v1/health/ready`.
   Show loading, then ready only after the real PostgreSQL-backed API returns 200.
3. The response is uncached, has a request ID and contains only safe status. Browser
   requests never include the facade secret or contact FastAPI directly.
4. Stop the isolated test API process. Recheck: show an explained French unavailable
   state, never a false success. Restart the process and recheck: readiness recovers.
5. Exercise the recheck by keyboard and touch, mobile/desktop and 200% browser zoom;
   preserve SP-01 navigation, form/table and error-recovery regression checks.
6. Test live/ready directly with HTTPX/pytest, real PostgreSQL connections, database
   outage/503, safe validation/errors, lifecycle disposal and connection recovery.
7. Inspect the existing development database before any migration. Provision/verify
   distinct test/benchmark/recovery targets and compare resolved identities. Refuse
   development aliases before test migrations or any reset; never reset development.
8. Exercise Alembic up/down/up on the verified isolated test target. Preserve unknown
   tables and refuse an unknown application migration state rather than stamping it.
9. Reproduce declared hash-locked installs in `backend/.venv`; run Ruff, mypy,
   pytest/PostgreSQL, frontend lint/types/build, full-stack Playwright and headed Chrome.

No business authorization, secure session cookie, file transfer, full backup/recovery,
real-device iOS, deployment or real-data claim is authorized by this foundation.

## Inspection

SP-01 technical acceptance verified. Python launcher reports 3.14.3. PostgreSQL
Windows installation metadata identifies version 18.2-1, service postgresql-x64-18,
installation `C:/Program Files/PostgreSQL/18` and bootstrap role postgres. The service
is running on port 5432. Connectivity, identities, contents and privileges still
require direct verification; no password is included in evidence.

## Results and handoff

The remaining execution details follow. Technical acceptance is recorded in the
sprint only after every applicable gate completes; product review is separate.

## Verified local identities and data preservation

All targets use the verified local installation, loopback localhost:5432 and the
supplied installation role postgres. The password was read privately by the setup
tool, never returned as tool output or copied to tracked files. PostgreSQL CLI
paths are registered by POSTGRES_BIN in ignored configuration; both psql and pg_dump
report 18.2 under `C:/Program Files/PostgreSQL/18/bin`.

Cluster system identifier: 7607060034405909976. Identity comparisons use this plus
the live database OID, not URL strings or suffixes alone.

| Target | Database | Resolved OID | SP-02 change |
|---|---|---:|---|
| Development | kayrealestate | 109060 | Initially zero user tables/no revision; added only Alembic version history at 0001_foundation |
| Test | kayrealestate_test | 109061 | Separate target; guarded baseline and synthetic migration/rollback probes |
| Benchmark | kayrealestate_benchmark | 109062 | Separate verified empty target; no benchmark/load performed |
| Recovery | kayrealestate_recovery | 109063 | Separate verified empty target; no restore performed |

The unrelated catalog SHA-256 was identical before/after development migration:
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` (empty catalog).
No unrelated rows existed or were changed; no development reset/drop/stamp occurred.
Only missing isolated databases were created. Migration tests clean up only their
synthetic probe objects. Unknown revision and nonempty unversioned schema were
refused without stamping. An actual subprocess invoking the pytest fixture with
TEST_DATABASE_URL pointing at development failed before the test body. A loopback
host alias was separately refused by the resolved-identity guard.

## Runtime and command evidence

Windows; Python 3.14.3 at backend/.venv/Scripts/python.exe. Node 24.13.1/npm 11.8.0;
Next 16.4.0/Tailwind 4.3.3/React 19.3.1 and Playwright 1.64.1 retained from SP-01.
Backend versions: FastAPI 0.143.1, SQLAlchemy 2.1.4, Psycopg 3.3.6, Alembic 1.20.0,
Pydantic 2.14.1, pydantic-settings 2.16.0, Uvicorn 0.54.0, pip 26.2.1,
pip-tools 7.6.2, Ruff 0.17.0, mypy 1.20.2, pytest 9.1.1, HTTPX 0.28.1,
Locust 2.46.7 and trustme 1.2.1. Complete package versions/hashes are in the two locks.

Commands below run from backend/ unless prefixed frontend/root.

| Check | Actual invocation | Result |
|---|---|---|
| Venv creation | `py -3.14 -m venv .venv` | Exit 0; only creation used base Python |
| Lock generation | `.venv/Scripts/python.exe -m piptools compile --allow-unsafe --strip-extras --generate-hashes --output-file requirements.lock pyproject.toml`; same with `--extra dev` and requirements-dev.lock | Exit 0; bootstrap compiler was declared pip-tools 7.6.2; build/pip tools included in hash lock |
| Locked installs | `.venv/Scripts/python.exe -m pip install --require-hashes -r requirements.lock`; then requirements-dev.lock; `-m pip install --no-deps --no-build-isolation -e .` | All exit 0; no global installs; exact declared tree, `pip check` exit 0 |
| Lock repeatability | Locked pip 26.2.1 / pip-tools compile with `--dry-run --reuse-hashes --allow-unsafe --strip-extras --extra dev --generate-hashes` | Exit 0; compiler works with the installed toolchain |
| Private setup and inspection | `scripts/kay.ps1 -Task setup`; `-Task inspect -Environment development/test/benchmark/recovery` | Exit 0; identities above; ignored .env/certificates generated; no OS/browser trust-store modification |
| Migrations | `scripts/kay.ps1 -Task migrate -Environment test`; same for development | Exit 0; 0001_foundation only; up/down/up and refusal tests below |
| Ruff/mypy | `scripts/kay.ps1 -Task check` | Exit 0: Ruff check, format --check, strict mypy; 14 source modules |
| Backend tests | `.venv/Scripts/python.exe -m pytest --cov=app` | 14/14 passed, zero skipped; 97% runtime coverage (CLI excluded explicitly) |
| HTTPS API | `.venv/Scripts/python.exe -m app.cli.serve`; `-m app.cli.smoke` | Real localhost:8000 TLS; explicit CA succeeds; default/untrusted CA refused; live/ready and missing-facade 403/no-store pass |
| Dependency audits | `.venv/Scripts/python.exe -m pip_audit --no-deps --disable-pip -r requirements.lock`; same for requirements-dev.lock | Both exit 0; no known vulnerabilities. Non-fatal local audit-cache warnings were not reported as application defects |
| Frontend checks | frontend: `npm run lint`; `npm run typecheck`; `npm run build` | All exit 0; optimized build includes dynamic health facade and workspace |
| Production smoke | frontend: `npm run start`; PLAYWRIGHT_BASE_URL=http://localhost:3000, `npm run test:e2e -- --project=chrome --grep '@shell'` | 4/4 passed; production facade real readiness returns 200/no-store |
| Headed Chrome | frontend: `npm run test:chrome` | 8/8 passed, zero skipped; desktop/mobile touch, actual API process stop/restart/retry, actual 200% browser zoom |
| Focused hydration rerun | frontend: `npm run test:e2e -- --project=webkit --grep '@shell' --repeat-each=3` | 12/12 passed after correction; no application console/hydration errors |
| Client secrecy | Compare generated browser JS against the private facade secret without printing it | 16 browser chunks checked; no match |

Final browser matrix: frontend `npm run test:e2e`, 35/35 passed, zero skipped,
across Chromium/installed Chrome/installed Edge/Firefox/WebKit, after all corrections.
Browser/channel versions are the verified SP-01 versions. The final documentation
validator (`powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`, root)
passed with exit 0: 22 sprint structures, 973 local links/anchors including 70 approved
skill links, 41 acceptance mappings, 13 synchronized Mermaid pairs and nine valid
API JSON examples. This documentation check does not imply an app test.

Final frontend runtime audit: `npm audit --omit=dev`, exit 0, zero findings. Full
`npm audit` still reports nine high development-only entries, not a clean result.
Built-server `/ui-checks` returned unavailable content with no fixture form.
Final normal-development HTTPS check on localhost:3000 used Node HTTPS with the
explicit CA and `rejectUnauthorized:true`: TLS authorized, 200 `ready`, no-store.
Windows curl/Schannel could not resolve private-CA revocation status; it was not
called a passing check and no global certificate/revocation bypass was introduced.
The temporary HTTP production-smoke server was stopped; development HTTPS frontend
and API remain running for review.

## Behavioral and security evidence

Backend HTTPX uses the real ASGI application/lifespan and real PostgreSQL; the
separate HTTPS smoke and Playwright use actual Uvicorn/Next processes. Cases cover
pool disposal, released/rolled-back sessions, separate live connections, live/ready,
unavailable database through an actually refused local socket, recovery, forged or
missing facade authority, safe validation/500/404, and redacted response/log content.
The existing shared PostgreSQL Windows service was never stopped or reconfigured.

The browser uses only same-origin allowlisted health calls; server-only Node HTTPS
adds facade authority and explicitly verifies the shared CA. Arbitrary target paths,
queries, browser role/header input, raw upstream messages and cached status are not
forwarded. Response schemas allow only safe status. Time/body/connection waits are
bounded. Missing authority is denied before a query. No business permission is
inferred from the shell or from the frontend's unavailable Settings label.

The integration harness delays one outgoing request only to observe genuine loading
and disabled state, then continues to the real backend (no fabricated response).
It stops/restarts its own isolated Windows API child tree. The private control token
is not sent through a browser or exposed as a product API route. Failure produces
503/French unavailable and retry restores real readiness. Expected 503 resource
messages and synthetic test-fixture errors are distinguished from application faults.

Private note, backend/.env, frontend/.env.local, certificates/private keys, control
metadata, caches and browser artifacts are ignored/not tracked. No credential,
session token, client record or real document appears in screenshots or evidence.
The client-chunk scan is targeted evidence, not a claim of a comprehensive secret scan.
Identity, CSRF, secure session cookies, file permits and business races are N/A here.

## Skills, visual review and resolved defects

All three required installed skills were read completely for this sprint. The four
task-relevant design-system-ops references were read. The running SP-01 shell and
supplied KAY logo reference were inspected before UI changes. The product/dashboard
surface is explicitly outside design-taste-frontend's marketing scope. Existing
installed responsive/React/uncodixfy guidance supplemented the work, with no optional
skill bundle installed or pointer changed.

The new status region reuses KAY reading width/gaps, shadcn Alert/Button/Skeleton,
success/danger tokens and 44px controls; no custom CSS, chart, new navigation,
alternate kit/font or decorative image was added. Desktop/mobile ready/unavailable
captures were viewed separately. Headed Chrome recorded DPR 2→4 and CSS width
1427→713 at real 200% zoom, with no overflow and working keyboard/navigation/recheck.
The zoom capture may crop on Windows high DPI and is supplementary, not standalone
full-layout proof. [AFTER audit 002](../../../anti-slop/audit-002-2026-10-14.md) has zero
numbered aesthetic findings; product/design review remains pending Khalid.

Corrected strict CLI result types, build-tool hash locking, the installed Starlette
TestClient deprecation (use the approved HTTPX transport/lifespan directly), Windows
venv child-tree termination for real failure tests, and a Radix/live-region hydration
race. Exact Firefox injected-debugger forced-layout diagnostics are excluded from
application-console assertions; no application warning is broadly suppressed. The
repeatable hydration and HTTPX corrections are saved in agent lessons.

## Remaining limits and handoff

The existing PostgreSQL service listens beyond loopback; this pre-existing service
configuration was not changed. KAY connections and both app servers bind/use loopback.
The supplied installation role is used for authorized local setup; future real-data
least-privilege/database/network hardening remains a separate boundary.

The inherited npm development-tool audit has nine high entries from the glob-parser
advisory already documented in SP-01; no compatible fix or forced downgrade was
introduced. Runtime npm audit remains separately reported. No production deployment,
real client data, actual iPhone/Safari or assistive-technology user test is claimed.
Locust is installed/locked but full load/backup/restore testing belongs to later sprints.

Reproduce through backend/README.md, frontend/README.md and the QA register. SP-03
is the next roadmap item, not part of this request. No source commit/push or external
publication was made. Product acceptance remains pending Khalid.
