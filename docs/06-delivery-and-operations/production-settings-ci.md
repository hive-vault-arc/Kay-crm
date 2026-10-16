# Production settings and split CI

2026-10-16. Owner-authorized configuration support and CI split. No production
connection, migration, bootstrap, deployment or customer data is used for testing.
Pending local UI work is excluded from publication.

## Production configuration

Set values privately through deployment configuration, never source or credential-
bearing shell arguments:

| Variable | Requirement |
|---|---|
| `APP_ENVIRONMENT` | Explicit `production`; local default remains development. |
| `PRODUCTION_DATABASE_HOST` | Exact managed PostgreSQL DNS hostname, without scheme/path/port. No wildcard, IP or loopback. |
| `DATABASE_URL` | PostgreSQL URL with explicit credentials/database and that exact host. Production accepts `postgresql://` and existing `postgresql+psycopg://`, normalized to pinned psycopg. |
| URL `sslmode` | Exactly `verify-full`, not `require`, `prefer` or `verify-ca`. |
| URL `sslrootcert` | `system` with libpq16+, or an absolute readable PEM CA path supplied by the deployment and parsed before startup. |
| `FACADE_SECRET` | Private, minimum32 characters; coordinate with the frontend facade. |
| `FRONTEND_ORIGIN` | Explicit non-loopback HTTPS origin, without credentials, path, query or fragment. |

For DigitalOcean Standard Edition, mount the downloaded cluster CA and reference
its absolute path. Advanced Edition uses system trust; libpq needs explicit
`sslrootcert=system`. See the provider's
[verified-TLS guidance](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/)
and PostgreSQL's [hostname verification contract](https://www.postgresql.org/docs/18/libpq-ssl.html).
Pinned local psycopg reports libpq18.4. Ambient service/host/hostaddr/dbname/user/
options query overrides and duplicate TLS arguments are refused. No TLS bypass.

Production/development do not require auxiliary URLs. Each isolated environment
requires only its own selected URL plus `DATABASE_URL` as the local development
identity baseline. Blank unused auxiliary URLs are absent. Selecting a missing
target, including a copied recovery configuration, fails without fallback.
Non-production URLs stay loopback-only; production rejects reserved isolated DB
names. Existing recovery/benchmark identities and admission rules remain.

Validation failures print only known variable names and codes, e.g.
`CONFIGURATION_INVALID: DATABASE_URL:TLS_VERIFY_FULL_REQUIRED`, never inputs,
URL values, credentials, Pydantic context or exception chains. Bootstrap retains
these diagnostics, TTY/hidden-input checks and one-time transactional rules.

## Process and migration boundaries

With private production configuration, from the managed backend directory:

```sh
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log
python -m app.cli.worker
```

These are separate service processes. Approved schema changes use
`python -m alembic upgrade head`; first-administrator bootstrap, only on a new
installation, uses `python -m app.cli.bootstrap_admin` in the intended
administrator's private interactive TTY. Neither DB command is run by this task.
No bootstrap credentials in environment, pipes, arguments or startup hooks.

API, Alembic, worker and bootstrap share the runtime-target guard. Production
does not invoke privileged synthetic `pg_control_system()` comparisons.
Test/benchmark/recovery retain exact names and live cluster/OID separation from
development. `assert_isolated` rejects development/production before any engine.
Offline migrations, unknown revisions and nonempty unversioned schemas remain
refused. No migration/schema, permission, authorization, session or business-rule
change. Managed operator runtime requires explicit production and the existing
exact Linux project-owned Python3.14.3 prefix; isolated modes still refuse it.

This does not implement cloud private-file storage, antivirus provisioning,
Windows-backup portability or complete production acceptance. Those limitations
remain; settings support is not proof the entire deployed CRM is ready.

## CI and release policy

Automatic CI keeps four prerequisite IDs: `repository`, `frontend`, `backend`,
`managed-runtime`. Repository/security, frontend lint/types/build/audit, backend
lint/format/strict types/pip check/audit, reviewed DB-independent units, and real
Linux production-style startup remain automatic. `CI required` uses `always()`
and rejects missing/extra/renamed, failed, cancelled or skipped prerequisites.
No `continue-on-error`. Workflow/aggregate policy tests also run automatically.

PostgreSQL/ClamAV setup, test migrations, full backend regression, compiled browser
integration and bundle-secret checks move to `integration-manual.yml`, triggered
only by `workflow_dispatch`. Original tests remain. Confirmation and fresh hosted
synthetic loopback targets are mandatory; no production URLs/repository secrets.
The existing lease and CI cluster/OID/HMAC safeguards remain. Its `Release
integration required` check fails unless both matrix instances succeed.

The unit runner selects reviewed pure modules/cases, refuses DB fixtures and
real SQLAlchemy/psycopg connections. Unknown tests remain excluded from unit mode
and DB-gated in normal/full pytest, which retains the mandatory isolated lease.
Windows asyncio may create a loopback socket pair; no database/scanner is started.
A deselected integration test is not a passed test.

### GitHub required-check settings

Read-back2026-10-16: main requires only GitHub Actions `CI required` (app15368),
strict up-to-date checks, PR, administrator enforcement, linear history and
resolved conversations; force push/deletion denied. No ruleset adds individual
Backend/Browser checks. Therefore **no required-check settings need changing**
here. Preserve protection. If another policy adds Backend/Browser regression or
the manual release aggregate as a main check, move it to the release gate, not
an always-pending manual merge check or removal of all protection.

### Real-customer release blocker

**Database-dependent backend and browser integration: NOT EXECUTED for this
change, NOT PASSED.** Before real customer data, run both preserved manual suites
on the exact candidate commit with disposable synthetic targets. Require successful
`Release integration required`, retain run URL/commit, and complete remaining
production/backup/permission checks and owner approval. Automatic CI success alone
is not release acceptance. Never run fixtures, pytest, browser integration,
benchmark or recovery harnesses against production. No real-data release is
authorized by source publication.

## Verification record

Local final checks before publication:

- Backend `./scripts/kay.ps1 -Task check`: Ruff/format pass, strict mypy177 modules.
  The separate `.github/scripts/buildpack-smoke.py` lint/format check also passes.
- Backend `.venv/Scripts/python.exe -m tests.unit_runner`:94 passed,503
  deselected,0 skipped,2.75s. Existing pure runtime/serve/packaging/CI/scanner-
  readiness-observer tests plus new configuration/isolation/entrypoint cases.
  No real database/scanner connection; the runner disables dotenv and installs
  connection denial before collection as well as per test. Default/full pytest
  still requires its isolated database lease.
- Backend venv `-m pip check`: no broken requirements; `-m pip_audit -r
  requirements.lock --require-hashes --disable-pip`: no known vulnerabilities.
- Root `node --test .github/scripts/required-check.test.mjs
  .github/scripts/dependency-policy.test.mjs`:16/16 pass,0 skipped. All four
  job failure/cancel/skip/missing/extra/rename cases are rejected.
- Root `node .github/scripts/check-tools.mjs actionlint`: exit0. Repository,
  redacted secret and documentation checks are also required before publication.
- Actual isolated `python:3.14.3-slim` Linux container: unchanged hash-locked
  runtime installed into `/workspace/backend/.heroku/python`; real Uvicorn in
  production mode, no auxiliary URLs, exact synthetic `.invalid` managed host,
  verify-full/system-root settings. Live200, unavailable-dependency503 and graceful
  shutdown pass, with no warning/error/traceback diagnostics. Only public source,
  lock and probe are mounted read-only, no local env/keys/data or host port. The
  disposable container removes itself. This does not test a real managed peer's
  TLS handshake, real database readiness, migrations or business transactions.

Hosted automatic results belong to the exact PR/push commit's Actions record;
local success is not labelled a hosted pass. Database/browser integration remains
**not executed, not passed**, and must pass the manual release gate before real
customer data. No frontend source, UI work, dependency pin or lockfile change is
included in this backend/CI publication.
