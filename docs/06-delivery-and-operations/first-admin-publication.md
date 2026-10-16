# First administrator and production support publication

2026-10-16. The owner requests a DigitalOcean Python script for their first
administrator and publication through passing CI to protected main. Publication
scope is backend production settings, public PostgreSQL CA, managed launchers
and the guarded bootstrap convenience entry point. Pending UI refinements are
excluded and remain local. No production database or administrator is created
by this task.

## Behavior and security

- `backend/create_first_admin.py` presets only the requested account email and
  calls the existing bootstrap. It asks for the display name and privately asks
  twice for a password. The supplied chat password is not copied into source,
  fixtures, documentation, logs, Git commits or process arguments. A fresh
  private password is recommended because the earlier one was shared in chat.
- No new SQL, role choice, API, signup route, migration or seed. The existing
  Argon2id, singleton row lock, zero-user/completed-marker checks and atomic
  user/credential/audit transaction are preserved. Repeat runs do not reset an
  existing user. Existing initialization/recovery/migration errors remain.
- Arguments, non-TTY/echo fallback, mismatched/weak passwords and interruption
  fail closed. Database/configuration errors retain value-free diagnostics and
  the database resource is closed. The generic bootstrap's email prompt remains.
- The supplied public CA and both managed launcher preflights are included with
  the pending production-settings/automatic-manual CI split. Verified TLS and
  migration/test isolation remain enabled. No database/browser release check is
  marked passed merely because automatic CI succeeds.

Run the script manually in the API's interactive DigitalOcean Console, from
the deployed backend directory, after approved migrations:

```sh
./.heroku/python/bin/python create_first_admin.py
```

The [bootstrap runbook](admin-bootstrap.md) and [public CA procedure](digitalocean-postgres-ca.md)
provide prerequisites, actual paths and limitations. Neither source publication
nor the first-admin script certifies cloud storage/antivirus/worker/recovery or
the whole application as ready for real customer data.

## Verification and publication record

Local and hosted results are recorded below as they actually finish. The full
manual database/browser release workflow is not executed/not passed by this
publication and remains required on disposable synthetic targets before customer
data, never production. Protected main still requires the up-to-date real
GitHub Actions `CI required` aggregate. No protection/check bypass is authorized.

- Backend `./scripts/kay.ps1 -Task check`: Ruff/format pass, strict mypy178 app
  modules pass. Both fixed managed-runtime probe scripts pass Ruff/format.
- Venv `-m tests.unit_runner`:117 passed,505 deselected,0 skipped,3.52s.
  The12 new pure bootstrap cases forbid real connections and cover the preset
  identity with synthetic overrides, hidden input, non-TTY/arguments, mismatch,
  interruption, echo fallback, existing initialization/migration errors and
  safe configuration/database error output. Original generic-mode tests remain.
- Venv `-m pytest tests/test_bootstrap.py -q --tb=short --maxfail=1`:
  original14/14 pass on the guarded isolated local test PostgreSQL,37.92s.
  Actual singleton locking/concurrency/atomicity and five real hidden-terminal
  cases pass. No production connection or supplied real password is used.
- New-entry-point focused rerun `-m pytest tests/test_bootstrap.py -k first_admin
  -q --tb=short --maxfail=1`:2/2 pass,14 deselected,12.33s. The real Windows
  pseudo-terminal enters a generated synthetic hidden password, creates one
  active administrator for a synthetic address, and refuses a repeat without
  changing it. No secret input is echoed or preserved as test evidence.
- An initial pure fixture patched a setup-phase stdout rather than pytest's
  call-phase capture, falsely reporting non-TTY. The test patches the current
  stream at invocation; the application TTY requirement was not relaxed. Ruff
  line-length corrections were made before the final passing checks.
- Final isolated `python:3.14.3-slim` probe with non-root UID65534, read-only
  source/runtime mounts, no host port and networking disabled passes bundled CA,
  actual first-admin script non-TTY refusal, worker configuration, Uvicorn
  liveness200, synthetic dependency503 and graceful shutdown. No warning/error/
  traceback. This is not a live DigitalOcean console or production TLS test.
- Repository-only sprint/link validation and `git diff --check` pass. The public
  CA remains byte-identical to the supplied certificate and includes no key.

Local results above are scoped, not a full backend/browser/manual release pass.
Publication uses existing [PR11](https://github.com/hive-vault-arc/Kay-crm/pull/11),
which already carries the required production configuration and CI split.
The exact candidate's hosted Actions checks must succeed before merge; their
actual run URLs and final main commit are reported in the task handoff/GitHub
record, not inferred from these local tests.
