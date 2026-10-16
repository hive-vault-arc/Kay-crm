# DigitalOcean PostgreSQL CA packaging

2026-10-16. Owner-supplied public CA, local implementation. No production
database connection, migration, bootstrap, secret use, push or deployment.

The above describes the initial CA preparation. The owner's subsequent
first-administrator request authorizes [scoped backend publication](first-admin-publication.md),
including this CA support, through protected main after passing CI. Pending UI
changes remain excluded. Live-container path readback is still not inferred.

## Artifact and deployment configuration

The certificate is bundled as
`backend/config/ca/digitalocean-postgres-ca.crt`, outside ignored local certificate
and data folders. Its bytes match the supplied Downloads file. Exactly one
public RSA CA certificate, valid self-signature, no private key or extra content.
[Public hashes and validity](../../backend/config/ca/README.md) record provenance.
No new package, dependency lock, TLS exception or trust-store installation.

Both API and worker must build from the same candidate source with `/backend`
as their source directory. Ordinary buildpack source packaging includes this
public file before any process starts. Keep its Git file mode100644, parent
directories traversable and mounts readable by the application user. No
production `.env`, local certificate key or data folder is part of this artifact.

Use these component run commands, relative to the backend source directory:

| Component | Run command |
|---|---|
| API | `sh scripts/start-api.sh` |
| Worker | `sh scripts/start-worker.sh` |

Each launcher first runs the public-file-only CA preflight, then `exec`s the
existing Uvicorn or worker module through the pinned managed interpreter.
The preflight imports no application settings and opens no connection. Missing,
unreadable, malformed or mixed-content files fail with only
`CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID`, not file/URL values or
exception details. Runtime/settings/isolation/authorization/migration guards
remain. Direct local `uvicorn app.main:app --reload` is unaffected.

These are component settings to apply to the actual existing App Spec, not a
replacement spec that invents resources, secret values or paid instance sizes.
DigitalOcean supports separate service/worker run commands and recommends
editing the current spec rather than overwriting it with an incomplete example.
[Official build/run command guidance](https://docs.digitalocean.com/products/app-platform/how-to/build-run-commands/).

For the existing buildpack layout evidenced by the owner's earlier logs, the
expected path in each component is:

```text
/workspace/backend/config/ca/digitalocean-postgres-ca.crt
```

Configure the private production `DATABASE_URL` query without printing the URL:

```text
?sslmode=verify-full&sslrootcert=/workspace/backend/config/ca/digitalocean-postgres-ca.crt
```

The exact `sslrootcert` field value is the path alone, without `sslrootcert=` or
the other query arguments. Existing settings require the exact configured managed
DNS host, verified TLS and readable/parseable absolute CA path. Do not switch to
`require`, `verify-ca`, a fake loopback host or disabled certificate checking.
[Provider verify-full guidance](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/).

## Confirm the actual deployed containers

In DigitalOcean's Console, select the API component, then separately the worker.
From the backend working directory run:

```sh
./.heroku/python/bin/python -m app.cli.check_postgres_ca
```

Expected public-only output for this layout:

```text
POSTGRES_CA_OK: sslrootcert=/workspace/backend/config/ca/digitalocean-postgres-ca.crt
```

This resolves the file's actual absolute path, reads it as the current application
user, rejects non-certificate payloads and loads it into a CA-only TLS context.
It never reads a URL or imports settings. Do not use `env`, `printenv`, `set`,
connection strings, `psql`, application worker execution or readiness probes to
obtain this path-only evidence. [Official component-console guidance](https://docs.digitalocean.com/products/app-platform/how-to/console/).

Live API path: **NOT CONFIRMED**. Live worker path: **NOT CONFIRMED**.
No connected DigitalOcean console/App Spec was provided. The owner's supplied
query suffix identifies the intended value, not proof of a file inside either
running container. Local implementation and isolated Linux evidence do not mean
the new files or run commands are already deployed. Preserve the current
no-push instruction for unfinished UI work. The later first-admin request permits
the separately scoped backend publication linked above.

## Verification boundary

Automated checks use synthetic configuration only. The reviewed unit runner
disables dotenv and forbids SQLAlchemy/psycopg connections. Production-style API
and worker cases cover both system trust and the actual bundled certificate;
full TLS mode and root path reach the engines unchanged. Worker status data is
stubbed at the database boundary; this is not a real queue-processing pass.
The public CA and managed launchers are included in recovery code artifacts,
without changing database/restore safeguards. Existing restore points are not
rewritten or exercised by this change.

The Linux probes use only allowlisted public source/config/scripts and the
unchanged hash-locked runtime. No workstation `.env`, key, database or host port
is exposed. Runtime probe containers have networking disabled. Actual live TLS
peer/hostname verification and production readiness are **not tested**; a public
CA alone cannot establish that the cluster presents the matching server chain.
Full database/backend/browser integration is **not executed, not passed** and
remains required on disposable synthetic targets before real customer data.
Never run those tests against production.

## Actual local results

- From `backend/`, `./scripts/kay.ps1 -Task check`: Ruff/format pass, strict
  mypy178 application modules pass. Venv Ruff check/format also passes both
  `.github/scripts/buildpack-smoke.py` and `worker-ca-smoke.py`.
- `.venv/Scripts/python.exe -m tests.unit_runner`:105 passed,503 deselected,
  0 skipped,3.58s. Deselected integration cases are not claimed passed.
  Cases cover source provenance, readable public-only CA, malformed/mixed/missing/
  permission-denied failures and redaction, pre-settings subprocess import,
  both launcher orders, recovery packaging, and API/worker engine TLS settings.
- Two isolated `python:3.14.3-slim` runtime probe containers use non-root UID65534,
  read-only root/source/runtime mounts, no host port and `--network none`.
  Both resolve/read the exact `/workspace/backend/config/ca/digitalocean-postgres-ca.crt`.
  Actual managed API launcher/Uvicorn:preflight, liveness200, synthetic unavailable
  dependency503, graceful shutdown and final warning/error-free diagnostics pass.
  The separate worker probe invokes the real `worker.main --status` configuration
  path with a stubbed status query, real engine URL inspection and a connection
  refusal guard. It proves settings/engine/disposal, not database queue execution.
- Both real shell launchers are also run with a deliberately invalid, public
  fixture file and no database configuration. Each exits1 with exactly
  `CONFIGURATION_INVALID: DATABASE_URL:TLS_ROOT_INVALID` and no traceback,
  path, URL or credential. Neither reaches settings/database startup.
- Initial Linux probe failed because its test-script directory did not expose
  the backend import root; the fixed repository-derived import path rerun passes.
  The next API run exposed an existing unclosed HTTP503 response ResourceWarning
  in the test probe. Closing that response fixes the cause; the final run has
  no warning/error/traceback, with warnings promoted to errors. Neither issue
  was hidden, suppressed or counted as the final clean run.
- Public-bundle Gitleaks8.30.1 directory scan with100% redaction:0 leaks, no
  exemption. `git check-ignore --no-index` confirms the public `.crt` is not
  ignored; private key/PEM/local-data ignore rules remain unchanged.
- Root `node --test .github/scripts/required-check.test.mjs`:8/8 pass; four-job
  aggregate and manual-only integration policy remain unchanged. Repository-only
  sprint/link validation passes. `git diff --check` passes.

No live deployment readback, hosted CI run or complete database/browser release
workflow is claimed. The temporary test containers/runtime volume are removed;
project app/test listeners are stopped and shared local PostgreSQL is retained.
