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
