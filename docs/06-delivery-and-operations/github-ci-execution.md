# GitHub CI execution

2026-10-16. Setup in progress. This record distinguishes local verification from
actual hosted results. [Policy and commands](github-ci.md).

## Local verification before publication

- Existing root repository had no commits/remotes. Target
  `hive-vault-arc/Kay-crm` was empty/public; authenticated user has ADMIN authority.
  Existing project README retained, no boilerplate appended and no history replaced.
- Root ignore/attributes updated. Private/generated files remain local. Upstream
  reference bytes/licenses are preserved, including11 explicitly hashed archives.
  Bklit Studio source was already absent; a future-copy guard was added.
- Initial index guard:8172 files/zero forbidden or oversized files/13 ignore probes.
  An earlier too-narrow archive rule rejected ten legitimate pinned shadcn starter
  archives; the explicit SHA256 reference manifest resolves that without allowing
  arbitrary archives. File counts will change as this runbook/test evidence is added.
- In-memory index comparison: seven private runtime values/8172 blobs/zero matching
  files. No values were printed. Initial Gitleaks findings were reviewed public
  documentation placeholders and AT-26 prose, not confirmed live secrets. Narrow
  rule/path exceptions were added; corrected staged scan finds zero leaks.
- actionlint passes. Repository-only sprint validation passes22 specifications,
  1131 repository links,41 acceptance mappings,13 Mermaid pairs and10 JSON samples.
  It does not require or create the ignored private note/external installed skills.
- Frontend lint/typecheck/build pass; icon guard27/21/40/zero violations. CI browser
  discovery finds79 cases in25 files, not an execution result.
- Backend Ruff check/format pass (283 files before the final CI-guard test), mypy
  passes177 application modules. Hash-locked runtime pip-audit finds no known
  vulnerabilities; redundant no-deps audit flags were removed after their warnings.
- GitHub repository read-back confirms Dependabot security updates, secret scanning
  and secret push protection enabled. No paid feature/subscription was enabled.

## Not yet verified

Hosted job execution and protected-main read-back remain pending until recorded
below. Khalid explicitly approved the narrow30-day existing dev-only advisory
exception. Its exact advisory/expiry and fail-closed runtime/new/critical checks
are now executable and covered by eight passing policy tests. Runtime npm audit
is clean; full audit reports nine inherited affected packages, not zero. No
framework downgrade, global audit suppression or false clean-audit claim was made.

The first real hosted run published commit20b80e4 to `ci/initial-setup` only.
Its frontend job passed. Repository safety found four links to the intentionally
absent private credential note in a fresh checkout; local presence had hidden
those missing-file failures. The validator now skips that one resolved private
path in repository-only mode, without creating/copying the note or skipping other
project links. Windows Python install/lint/types/runtime audit passed and its
real PostgreSQL18.6/ClamAV setup, fresh configuration and migrations passed.
Its backend suite began, but a corrected revision supersedes the failed run;
no partial test run is counted as a complete pass. Main has not been created
on a failed CI result. The corrected workflow uses separate disposable Windows
matrix machines for backend/browser suites, reducing elapsed time without
parallel writers against the same isolated target.

Git housekeeping moved18 incomplete `tmp_obj_*` files into ignored recoverable
quarantine, then ran `git gc --no-prune` and full integrity verification. No valid
object/history was pruned: loose objects/garbage0, two packs, clean fsck. This
resolves the initial loose/temporary-object warnings without deleting source.

## Hosted failures retained before promotion

- [Run38864605404](https://github.com/hive-vault-arc/Kay-crm/actions/runs/38864605404):
  frontend passed; four missing private-note links failed the clean-checkout
  validator; backend100 passed/1 failed at the protected-file clean-state assertion.
  Native definitions/PONG had passed, which did not prove actual byte scanning.
- [Run38865233639](https://github.com/hive-vault-arc/Kay-crm/actions/runs/38865233639):
  corrected repository and approved dependency-policy/frontend jobs pass. Backend
  again100 passed/1 failed at the same pending-scan assertion; browser19 passed/
  1 failed at the real file workflow. The required aggregate correctly fails.
  Neither failed revision was promoted to main.
- The same protected-file test passes locally (8.71s) with the identical verified
  native ClamAV1.5.4 binary and real cached definitions on isolated port3320.
  That diagnostic service was stopped afterward. No product scanner verdict,
  timeout, permission or durable retry behavior was relaxed.
- CI setup now uses native SCM service mode, an explicit writable scan temp
  directory and real clean/rejected INSTREAM readiness before running tests.
  Six CI-setup guard/readiness tests pass; current backend discovery is499 cases.
  A failed file assertion additionally reports only its safe scan-error code.
  Safe native service logs/status and unconditional owned-service shutdown support
  diagnosis without outputting application credentials or broadening a proxy.
  Hosted verification of this correction remains pending.

- [Run38866375381](https://github.com/hive-vault-arc/Kay-crm/actions/runs/38866375381)
  caught an installer argument error before tests: native ClamAV reads its config
  even for `--install-service`; supplying the existing explicit config fixes the
  missing-default-file failure. Scanner diagnostics prove no scanner process/
  listener was left running, and owned PostgreSQL shutdown succeeds. Official
  action releases are upgraded to verified SHA-pinned checkout7.0.1/setup-node7.1.0/
  setup-python7.0.0 after an old action emitted a punycode deprecation warning.
  Their official input/runtime contracts were inspected; product runtimes remain
  Node24.13.1/Python3.14.3, not upgraded with the action runtime.

- [Run38866820245](https://github.com/hive-vault-arc/Kay-crm/actions/runs/38866820245):
  repository/frontend pass and native SCM real clean/rejected readiness succeeds.
  Backend334 passed/1 failed: the restore body verifies69 tables/3 objects, but
  cleanup correctly refuses the CI database because the old helper hard-coded
  this laptop's recovery OID/cluster. The correction preserves that exact local
  guard and captures signed per-job identities before migrations for CI only.
  Eight identity-baseline tests cover valid, tampered, missing, wrong-workspace,
  wrong-port, aliased and wrong-observed identities plus the retained local guard.
- That run's browser17 passed/1 failed at queued export readiness; the old
  supervisor reported a live child, not completed initialization. A test-only
  observer now emits readiness only after original real maintenance admission,
  without replacing the production worker loop or granting access. A delegation
  test proves false admission remains false and readiness is emitted once.
  The original15-second export-ready assertion remains unchanged. Process-control
  timeouts now include acknowledged worker/fixture startup, not a fixed sleep.
- Final local focused export cases pass27.2s/16.5s on the corrected observer;
  file/recovery and final hosted aggregate outcomes are recorded when available.
  Current CI guard/readiness/identity/observer selection:15/15 passed1.22s.
  Backend formatted source count288. No main promotion on these failed runs.
