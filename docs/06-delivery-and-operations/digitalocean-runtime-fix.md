# DigitalOcean managed Python startup repair

Historical runtime-only repair below. The subsequently authorized
[production settings and CI split](production-settings-ci.md) supersedes its
all-URLs/local-only configuration limitation and automatic integration policy,
not its historical test results or remaining production-readiness limitations.

2026-10-16. Owner-authorized fix/publication for the supplied deployment failure,
not production acceptance or permission to weaken unrelated runtime boundaries.

## Cause and change

The supplied build succeeds on Python3.14.3, then package import calls the local
venv guard before Uvicorn can bind8080. Its managed prefix is
`/workspace/backend/.heroku/python`, not this laptop's `backend/.venv`.
Connection-refused health probes are the consequence of that early exit.

`app.__init__` now calls `require_runtime`. It accepts the existing pinned local
venv or, on Linux only, Python3.14.3 whose resolved prefix equals this backend's
`.heroku/python`. Resolving both sides supports the buildpack's own symlinked
installation. Wrong versions, other prefixes/platforms and arbitrary global
interpreters still fail. There is no skip-check flag or broad cloud-environment
bypass. `require_venv` remains strict; `app.cli.__init__` explicitly preserves
that requirement for all existing local operator commands before they load.

DigitalOcean's [Python buildpack reference](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/python/)
documents its Heroku-based runtime and Python3.14.3 support. The
[official buildpack implementation](https://github.com/heroku/heroku-buildpack-python/blob/main/bin/compile)
uses `.heroku/python` and symlink relocation. The supplied actual deployment log,
not a guessed environment variable, establishes this app's managed path.

No dependency pin/hash, API, permission, cookie/session, database validator,
worker/storage/backup rule or migration changes. Managed runtime artifacts are
ignored and explicitly rejected by the repository index guard.

## Run command and remaining configuration boundary

From the existing `backend` source directory, the normal Uvicorn service command
binds the platform's port:

```sh
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log --ws wsproto --ws-max-size 512 --ws-max-queue 4
```

No factory flag, development reload or Windows interpreter path is needed there.
See DigitalOcean's [run-command guidance](https://docs.digitalocean.com/products/app-platform/how-to/build-run-commands/).
The non-secret process liveness route is `/api/v1/health/live`. It is not proof
that a database, file worker, storage or the authenticated CRM is ready.

**This patch fixes the reported interpreter exception only.** Existing settings
still require `DATABASE_URL`, `TEST_DATABASE_URL`, `BENCHMARK_DATABASE_URL`,
`RECOVERY_DATABASE_URL` and `FACADE_SECRET`; they still reject non-loopback
PostgreSQL URLs. Missing/invalid settings fail with the existing redacted
`CONFIGURATION_INVALID` code. Do not upload the laptop's ignored `.env`, keys or
real records, replace a managed host with a fake localhost URL, or disable these
checks to get a green deployment. Managed-database/secrets, TLS/forwarded-origin,
persistent private storage/antivirus/worker and non-Windows recovery configuration
need their separate deployment implementation/approval. The current local-only
boundaries are retained, not silently converted into production support.

No DigitalOcean account/resource/configuration is accessed by this repair.
A push may trigger the owner's configured autodeploy, but actual cloud readiness
is not inferred from publication or the isolated smoke test.

## Verification and security evidence

Before the fix, the new package-import regression reproduces the same RuntimeError.
After it, from `backend/`, using only the explicit local venv:

```powershell
.venv/Scripts/python.exe -m pytest tests/test_runtime.py tests/test_serve.py tests/test_packaging.py tests/test_foundation.py -q --tb=short --maxfail=1
.venv/Scripts/python.exe -m ruff check app/runtime.py app/__init__.py app/cli/__init__.py tests/test_runtime.py ../.github/scripts/buildpack-smoke.py
.venv/Scripts/python.exe -m ruff format --check app/runtime.py app/__init__.py app/cli/__init__.py tests/test_runtime.py ../.github/scripts/buildpack-smoke.py
.venv/Scripts/python.exe -m mypy app
```

Focused regression32/32 passes, including15 new runtime cases; Ruff check/format
passes all five changed Python files, strict mypy passes177 app modules. A root-
cwd Ruff invocation classified imports differently; the documented backend-cwd
commands pass without changing/suppressing the correctly classified imports.

An isolated Linux container, official `python:3.14.3-slim`, installs the unchanged
hash-locked runtime into `/workspace/backend/.heroku/python` and runs the actual
`app.main:app` through Uvicorn. It verifies HTTP liveness200, intentionally
unavailable synthetic database503 and completed graceful shutdown, with no
warning/error/traceback diagnostics. Normal Uvicorn SIGTERM re-raising is accepted
only with its completed-shutdown message. Only source, the public lock and probe
are mounted read-only; no local `.env`, key, database, file store or host port is
exposed. The disposable container removes itself; the downloaded public image
may remain cached. This emulates the runtime layout, not a full DigitalOcean
buildpack/deployment or real-data integration.

The new required `Linux managed runtime` CI job repeats that real startup probe
on Ubuntu with exact Python and hash locks. The existing aggregate now requires
it alongside repository/frontend/integration results. Full Windows backend and
compiled browser regressions remain mandatory; none is skipped or weakened.
No Actions permission, secret, production service or bypass actor is added.

Main still requires a PR and successful up-to-date `CI required`, including
administrators. The public PR/check/merge record supplies hosted publication
evidence; a local test or pending run is never labelled a hosted pass. Unrelated
uncommitted UI changes are excluded from this hotfix publication.

Lesson: package-import guards apply to managed interpreters too. Separate the
allowed application runtime from stricter local CLI tooling, preserve fail-closed
configuration and verify a real Linux process rather than deleting all guards or
assuming a successful dependency build means the application can start.
