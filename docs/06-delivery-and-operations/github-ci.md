# GitHub publication and protected main

Scope: publish the existing local CRM to `hive-vault-arc/Kay-crm`, run real CI,
and prevent unvalidated changes reaching main. This is source publication and
synthetic CI, not application deployment. The target repository is public.
No open-source license for KAY's own code is invented by this setup; existing
third-party notices and upstream reference licenses remain authoritative.

## Checks

The [workflow](../../.github/workflows/ci.yml) runs on every branch push,
pull requests targeting main, merge-group events and manual dispatch. No path
filters can leave the required check pending for documentation-only changes.

| Job | Boundary |
|---|---|
| Repository safety | Indexed path/size/mode rules,13 ignore probes, approved archive hashes, full-history Gitleaks with redacted diagnostics, actionlint, portable documentation checks |
| Frontend quality | Exact Node version, `npm ci`, icon inventory/ESLint with zero warnings, TypeScript, production build, runtime dependency audit |
| Backend regression / Browser regression | Separate hosted matrix instances; exact Python venv/hash locks, Ruff/format/mypy, locked runtime audit, actual PostgreSQL18/ClamAV, migrations, full serial pytest, compiled serial Chromium journeys and bundle-secret checks |
| CI required | Always runs and fails if any prerequisite failed, was cancelled or skipped |

Khalid explicitly approved one30-day development-only exception on2026-10-16:
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
the unpatched braces stack-exhaustion issue inherited through nine tooling packages.
The [machine-readable exception](../../.github/dependency-exceptions.json) expires
2026-11-15T00:00:00Z. `npm run security:check` audits both full/runtime closures:
any runtime issue, different advisory, critical escalation or expired exception
fails. Eight policy tests include negative/expiry/cycle/malformed-report cases.
This is not a clean full audit, and no framework downgrade is used to hide it.

The Chromium configuration currently discovers79 cases, including two Iconsax
SSR/offline tests. It intentionally excludes the development-only `/ui-checks`
interactive case: that route is closed in compiled mode. Mobile, Edge, WebKit,
visible native Chrome, full-size load/recovery timing and human product review
remain separate local acceptance exercises, not claimed by this CI configuration.
The backend regression includes its real Windows DPAPI/ACL/pg_dump recovery tests.

## CI isolation and supply chain

- GitHub-hosted runners only; no self-hosted access to this laptop/development DB.
- Windows job downloads PostgreSQL18.6 binaries from EDB, the official Windows
  distribution linked by PostgreSQL, and ClamAV1.5.4 from Cisco-Talos. ZIPs are
  pinned by SHA256; antivirus definitions are fetched and verified by freshclam.
  Failed download/update/readiness fails the job; no fake scan verdict fallback.
  Native ClamAV runs through its official Windows service mode, with an explicit
  writable temporary directory. Readiness requires a real clean image and a real
  rejected controlled signature, not merely an open port/PONG. Owned services are
  stopped in an always-run cleanup step, even after test failure.
  Local PostgreSQL18.2 and Docker configuration are not upgraded by CI setup.
- A new loopback-only PostgreSQL cluster uses5433 and a random masked password.
  Four fresh named databases preserve development/test/benchmark/recovery identity
  separation. Configuration refuses existing targets/configuration or non-GitHub
  Windows execution. HTTPS keys/facade secrets are generated per job, ignored and
  masked. No repository secret, staff account or local private note is required.
  Before migrations, provisioning records all four live database identities in
  an ignored, HMAC-authenticated baseline. Recovery fixture cleanup must match
  that exact workspace/cluster/OID/name set and loopback5433 URLs, or refuses DDL.
  The fixed laptop recovery identity remains mandatory outside GitHub CI.
- All Python operations after venv creation use `backend/.venv/Scripts/python.exe`.
  Database-writing pytest and browser supervision run sequentially under their
  existing exclusive lease within each target. Backend/browser matrix jobs run
  on different fresh hosted machines, so their independent clusters can safely
  execute concurrently. No application authorization/isolation guard is relaxed.
  Browser supervision acknowledges worker startup only after the real worker's
  first successful maintenance admission. The test-only observer delegates the
  original method unchanged; it cannot grant admission or fake a queued effect.
  Existing export readiness assertions still require real publication/delivery.
- Actions use full commit SHAs; checkout does not persist credentials. Workflow
  token is read-only. No `pull_request_target`, deployment, remote messaging or
  automatic merge/push step executes untrusted PR code with elevated permissions.
- Full private/generated output and reports are not uploaded as artifacts.
  Existing auth report sanitization remains in place. Secret scans redact values;
  documentation exceptions are narrow reviewed examples, not blanket source skips.
- Third-party source archives are permitted only at explicitly hashed reference
  paths. Upstream bytes and notices are preserved. Studio source was never in the
  Bklit snapshot; an ignore/guard rule prevents future accidental redistribution.

## Main branch policy

Initial publication uses a setup branch first. Main is created only after a real
successful CI run on the intended commit. Server-side protection is then configured
and read back; a workflow file alone does not enforce merge policy.

The intended policy requires a pull request and the successful GitHub Actions
`CI required` check on an up-to-date branch. Administrators are included; force
pushes and branch deletion are denied, conversation resolution and linear history
are required. No person/app is assigned a bypass. Since the current workflow is
solo-maintained, a second person's approval is not mandatory: automated checks are
mandatory, and optional human review is still possible. Repository administrators
can inherently edit repository settings; branch protection cannot remove that
administrative authority.

After setup, work on a feature branch:

```powershell
git switch main
git pull --ff-only
git switch -c feature/describe-the-change
# Edit and run relevant checks.
git add <reviewed-files>
git commit -m "Describe the change"
git push -u origin feature/describe-the-change
gh pr create --base main
```

Merge through the pull request only after CI passes. Do not force push main,
disable checks to merge a failure, or commit ignored configuration. Secret push
protection is an additional layer, not permission to skip local review. Dependabot
opens compatible dependency/action update PRs; it never automatically merges them.
Changes to exact framework/Python baselines and Python hash locks need review and
regeneration in the project venv, not unreviewed `audit fix --force` changes.

For local early feedback, enable the committed pre-push hook in each clone:

```powershell
git config core.hooksPath .githooks
```

It refuses direct main pushes and runs the index guard/full-history secret scan
before sending a feature branch. Node and an initial verified-tool download are
required. Local hooks can be bypassed and are not the server-side enforcement.

## Publication review

The root `.gitignore` excludes the local credential note, `.env` files (except
blank examples), keys/certificates, private storage/backups/passfiles, venvs,
dependencies, caches, browser evidence and build output. Generated files that are
already tracked would require explicit index removal; `.gitignore` is not a
retroactive history scrub. Rotate an exposed secret before any cleanup claim.

The initial local index scan additionally compares all indexed blobs with the
known private runtime values in memory, printing counts only. Keep this distinct
from pattern-based Gitleaks and from scanning built browser bundles. No raw values
or private scan reports are committed.

Actual publication, job results, protection read-back and remaining limitations
will be recorded in [GitHub CI execution](github-ci-execution.md).
