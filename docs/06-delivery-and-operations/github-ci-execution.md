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
below. An inherited frontend dev-tool advisory has no patched release; its narrow
exception versus blocking-publication policy was presented to the user. Runtime
npm audit is clean. No framework downgrade, global audit suppression or false
zero-vulnerability claim was made.
