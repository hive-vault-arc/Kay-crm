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
| Backend and browser tests | Exact Python venv/hash locks, Ruff/format/mypy, locked runtime audit, actual PostgreSQL18/ClamAV, migrations, full serial pytest, compiled serial Chromium journeys and bundle-secret checks |
| CI required | Always runs and fails if any prerequisite failed, was cancelled or skipped |

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
  Local PostgreSQL18.2 and Docker configuration are not upgraded by CI setup.
- A new loopback-only PostgreSQL cluster uses5433 and a random masked password.
  Four fresh named databases preserve development/test/benchmark/recovery identity
  separation. Configuration refuses existing targets/configuration or non-GitHub
  Windows execution. HTTPS keys/facade secrets are generated per job, ignored and
  masked. No repository secret, staff account or local private note is required.
- All Python operations after venv creation use `backend/.venv/Scripts/python.exe`.
  Database-writing pytest and browser supervision run sequentially under their
  existing exclusive lease. No application authorization/isolation guard is relaxed.
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
