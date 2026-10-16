# Local installation, acceptance and benchmark

SP-22 procedure,2026-10-16. Read the [execution ledger](../03-planning/sprints/sp-22-execution.md)
for actual results and remaining gates, not a presumed pass. This is local C01–C14,
not production deployment. [AT map](../03-planning/sprints/sp-22-acceptance-map.md),
[actual API catalogue](../04-design/api-catalogue-local.md).

## Reproduce the normal local stack

Prerequisites: Windows, Python3.14.3, Node24.13.1/npm11.8.0, PostgreSQL18 with
matching dump/restore tools and Docker Desktop. Existing locked package versions
remain authoritative; no global Python package installation or JWT/broker swap.

From backend/:

~~~powershell
py -3.14 -m venv .venv
.venv/Scripts/python.exe -m pip install --require-hashes -r requirements-dev.lock
.venv/Scripts/python.exe -m pip install --no-deps --no-build-isolation -e .
.venv/Scripts/python.exe -m pip check
scripts/kay.ps1 -Task setup
scripts/kay.ps1 -Task inspect -Environment development
scripts/kay.ps1 -Task migrate -Environment development
docker compose -f compose.clamav.yaml up -d
scripts/kay.ps1 -Task bootstrap
~~~

Only venv creation uses the base interpreter. Setup privately obtains the
authorized local configuration; do not print credentials or copy this laptop's
private note to another machine. Inspect target identities before migration.
Setup creates missing isolated databases, never resets existing development.
The pinned scanner must be healthy before testing clean uploads. Bootstrap is
interactive, once only, with the intended administrator's own hidden password;
installation never seeds users. Staff handoff remains an actual human action.

In separate local terminals from backend/:

~~~powershell
.venv/Scripts/python.exe -m app.cli.serve --environment development
.venv/Scripts/python.exe -m app.cli.worker
~~~

From frontend/:

~~~powershell
npm ci
npm run lint
npm run typecheck
npm run build
npm run start
~~~

Open https://localhost:3000. API is HTTPS localhost:8000; server-to-server TLS
verifies the private CA. Disposable test contexts accept this local certificate;
no system trust store is changed. For development use npm run dev instead of
start. Do not run both on the same port. Use the [website runbook](../04-design/website-intake-local.md)
only after creating an active agent; it is a separate synthetic signed source,
not the unidentified real website. Shutdown each owned foreground service with
Ctrl+C and stop only this compose project, preserving its signature volume.

## Reproduce acceptance without redundant browser repetition

From backend/, while no browser writer owns the isolated test lease:

~~~powershell
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
.venv/Scripts/python.exe -m mypy app
.venv/Scripts/python.exe -m pytest -q --tb=line --maxfail=3 --cov=app --cov-report=term:skip-covered
~~~

From frontend/, after a successful build:

~~~powershell
$priorMode = $env:KAY_E2E_PRODUCTION
try {
  $env:KAY_E2E_PRODUCTION = '1'
  npm run test:e2e -- --config=playwright.acceptance.config.ts --max-failures=3
  if ($LASTEXITCODE -ne 0) { throw 'ACCEPTANCE_MATRIX_FAILED' }
  npm run test:e2e -- --config=playwright.final-chrome.config.ts --max-failures=2
  if ($LASTEXITCODE -ne 0) { throw 'NATIVE_REVIEW_FAILED' }
} finally { $env:KAY_E2E_PRODUCTION = $priorMode }
npm run test:e2e -- --project=chrome --grep 'live shadcn/RHF/Zod/table'
if ($LASTEXITCODE -ne 0) { throw 'DEVELOPMENT_COMPONENT_CHECK_FAILED' }
~~~

The matrix is the full compiled Chrome regression, itself visible, plus19
cumulative journeys on Edge, mobile Chromium/Pixel7 and mobile WebKit/iPhone13.
The additional focus check brings this inventory to134 variants (77+19+19+19).
The native review adds actual browser200% zoom, touch/keyboard, reduced-motion
and settled screen-family/restored-state captures. The one development-only
component fixture is deliberately not served in production. The private test
supervisor owns8100/8101, compiled frontend3100 and its worker/simulator/recovery
children; it guards synthetic data and serializes writers. Do not run two test
commands concurrently or replace real responses with mock CRM data.

Each browser is installed through the pinned Playwright package; Chrome/Edge
use installed channels. Emulated WebKit is not actual iOS Safari. No phone or
real staff/website is certified by these commands. Reports omit secret-bearing
API steps/contexts; explicit screenshots must still exclude populated passwords.

## Full-volume benchmark, separate from tests and development

From backend/, only when no build/test/browser workload competes for measurement:

~~~powershell
$priorEnvironment = $env:APP_ENVIRONMENT
try {
  $env:APP_ENVIRONMENT = 'benchmark'
  .venv/Scripts/python.exe -m benchmarks.dataset
  if ($LASTEXITCODE -ne 0) { throw 'BENCHMARK_SEED_FAILED' }
  .venv/Scripts/python.exe -m benchmarks.plans
  if ($LASTEXITCODE -ne 0) { throw 'BENCHMARK_PLANS_FAILED' }
  .venv/Scripts/python.exe -m benchmarks.run
  if ($LASTEXITCODE -ne 0) { throw 'BENCHMARK_GATE_FAILED' }
} finally { $env:APP_ENVIRONMENT = $priorEnvironment }
~~~

Run dataset **once** against the verified empty benchmark target. It refuses
nonempty data/existing credentials; there is no reset flag. For subsequent load
runs omit dataset. Deterministic synthetic IDs/distribution use exactly100
accounts,200,000 contacts and20,000 physical properties including16,000 units;
passwords remain securely random and current-user DPAPI encrypted. Constraints
remain enabled. Development/test/recovery aliases and identity changes refuse.

run owns the exact loopback HTTPS8200 API tree and Locust child, then stops them.
It explicitly starts4 API processes through the normal bounded --workers CLI,
not a benchmark-only app. The interactive default remains1; for the measured
100-user configuration use --workers4 on the same local CLI. Each process keeps
pool5/overflow0, at most20 query connections plus admission/worker/operator leases.
Uvicorn uses its Windows-compatible spawn/factory mode. No SQL timeout increase.
The real session/CSRF workload ramps10users/s, waits for all100 logins, warms15s,
then measures60s with100 concurrent users and0.5–1.0s think time. Mix weights:
contacts30%, enquiries20%, properties20%, contact detail10%, dashboard10%, actual
committed note write10%. All failed/slow requests remain in the samples. Each
route needs≥50 requests, zero failures and exact p95≤1000ms ordinary/≤2000ms
dashboard; missing/short/reduced-user measurement fails. No target reduction.
Results/query plans stay in protected ignored .local-data/benchmark; publish
aggregate counts/timings/indexes/hardware only, never credential contents.

## Persistence and recovery

The restart E2E compares the same contact/deal through a real API stop/start and
then expires the session across all main screen families. Database/file restore,
worker replay, current-authority opening and same-laptop RPO/RTO follow the
[backup/recovery runbook](local-backup-recovery.md). Do not restore over
development or claim the small synthetic recovery exercise measures full-volume,
offline-source-loss or offsite disaster recovery. Product review remains Khalid's.
