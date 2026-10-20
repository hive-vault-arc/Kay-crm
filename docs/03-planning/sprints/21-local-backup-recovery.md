# SP-21 — Local backup and recovery

Status: technically_accepted at the scoped local boundary  
Date: 2026-10-16  
Priority: 21 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed; [execution and retained limits](sp-21-execution.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-20](20-local-website-intake.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: protected Windows local points and guarded opening are implemented/verified as documented; no new migration or dependency.  

## Goal and traceability

An isolated restore proves that database, files and authorization history can be recovered coherently on this laptop.

- Requirements: C14, C13.
- Business rules: BR-02, BR-06, BR-23, BR-24.
- Screens/interactions: Restored S01/S02/S03/S08/S09/S11 smoke journey; local CLI operations.
- Acceptance scenarios: AT-25 and recovery regression portions of AT-02/26/37.
- API boundary: Existing API behavior after restoration; no public backup/restore endpoint.
- Data boundary: application database snapshot, immutable file versions, hashed manifest, compatible code/migration/lockfile versions and session/permit revocations.
- Entry prerequisites: SP-20 accepted; separate recovery database/directory and PostgreSQL tools plus protected local backup location.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-25 and recovery portions of AT-02/26/37 pass at the named synthetic local boundary. The frontend is verified unchanged, not redesigned; cumulative SP-22 and Khalid's product review remain pending.

## Documentation to follow

Read the relevant clauses for the C/BR/AT identifiers above before editing. These are direct links, not a request to recreate the specification.

- [Local roadmap, runtime, defaults and required exit gates](../local-roadmap.md)
- [Agent instructions](../../../AGENTS.md)
- [C01–C14 scope](../../../core-scope.md)
- [Decision register](../../../decisions.md)
- [Business rules](../../02-requirements/business-rules.md)
- [Roles and permissions](../../../permissions.md)
- [Business workflows](../../../workflows.md)
- [Data model and constraints](../../04-design/data-model.md)
- [API contract](../../04-design/api-contracts.md)
- [Architecture](../../04-design/architecture.md)
- [Screen map](../../04-design/screen-map.md)
- [Current design system](../../04-design/design-system.md), [screen map](../../04-design/screen-map.md), and applicable owner-supplied references
- [Mandatory UI skill rules, timing and applicability](../ui-skill-rules.md)
- [antislop skill](<C:/Users/khali/.codex/skills/antislop/SKILL.md>)
- [design-system-ops skill](<C:/Users/khali/.codex/skills/design-system-ops/SKILL.md>)
- [design-taste-frontend skill](<C:/Users/khali/.codex/skills/design-taste-frontend/SKILL.md>)
- [Coding standards and reuse](../../01-working-agreements/coding-standards.md)
- [Repository structure](../../01-working-agreements/repository-structure.md)
- [Acceptance scenarios](../../05-quality/acceptance-tests.md)
- [Harness, evidence and handoff](../../HARNESS.md)
- [QA command register](../../QA_COMMANDS.md)
- [Security check](../../SECURITY_CHECK.md)

Framework/component topics for this sprint:

- [Recovery contract (local sections only)](../../06-delivery-and-operations/release-and-recovery.md)
- [Recovery diagram](../../../diagrams/recovery.mmd)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html)
- [PostgreSQL pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)
- [Python reference and quality guide](../../reference/python/README.md)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Prepare a reproducible browser smoke journey through a restored local stack; show any invalidated session returning to login.
- [x] Verify restored contact/deal/project/files/calendar views and authorized dashboard relationships.

## Backend tasks

- [x] Implement venv-launched local backup/restore utilities that call the PostgreSQL 18 binaries safely and never emit credentials.
- [x] Take coherent database/file restore points using an explicit local maintenance/write pause and immutable-file manifest; pause relevant worker effects and resume after completion.
- [x] Store protected local backup metadata and 30-day retention scheduling; test expiry with a controlled clock.
- [x] Restore only into the explicitly isolated recovery database and directory, revoke restored sessions/permits, reconcile fenced jobs/finance/import/website effects and measure RPO/RTO.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Verify snapshot schema/migration compatibility, row counts, FKs, hierarchy/offerings, commission balances, policy/windows and audit/history integrity.
- [x] Never overwrite/reset the supplied development database; verify recovery target identity before any restore.

## Testing tasks

- [x] Run AT-25 with real pg_dump/pg_restore and local file copies, including file hashes/scan states and missing/corrupt manifest rejection.
- [x] Test restored revoked sessions/permits remain unusable and replay does not bootstrap another administrator.
- [x] Run Playwright/Chrome against the restored stack; measure data loss ≤1 hour and recovery ≤4 hours with named hardware/environment.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] A coherent isolated restore preserves data, files, history and current authorization safety.
- [x] RPO/RTO and 30-day retention behavior have real local evidence; all restore-target guards pass.
- [x] Restored-stack backend/E2E/Chrome checks pass and backup/recovery commands are documented reproducibly.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Sign in to the isolated restored stack, inspect a contact/deal/project and clean file, and verify an old restored session/permit fails.

## Verification evidence

Actual commands, environment, corrected attempts, timings and limitations are in
[SP-21 execution](sp-21-execution.md); commands and operational guards are in the
[local runbook](../../06-delivery-and-operations/local-backup-recovery.md).

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | Exit0; build v91FEgd-yN7dS7wBB9-Hm; no shipping UI edit |
| Backend quality/unit/API | pass | Explicit venv Ruff/format/mypy; 22 tests plus1 added drain race, zero skipped |
| PostgreSQL/migration/concurrency | pass | Real PG18.2 dump/restore,69 table digests/files; testOID109061/recoveryOID109063; development unchanged; no migration |
| Playwright E2E | pass | Final compiled Chrome1/1; old session/permit denied, fresh scoped restored journey; RPO5.134216s/RTO36.100s |
| Visible Chrome review | pass | Final headed1/1; agent/admin/unrelated roles, six widths, keyboard/touch,11 inspected frames; RPO4.072028s/RTO43.133s |
| UI skills and AFTER audit | pass at verification-only scope | Three complete reads/system reuse; dense CRM exclusions; AFTER021 zero new findings, no audit-only fixes or UI source edits |
| Security/permission review | pass at local boundary | Protected encrypted points, exact isolation/compatibility/authority guards, retention/interruption/replay/denial/privacy evidence in execution |
| Implementation docs/traceability | updated | QA/harness/security/contracts/tests/traceability/runbook and current planning status linked |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: corrected fixture, restore/cleanup, controller and browser-test attempts retained in execution; no unresolved required scoped defect. Nonfatal Windows teardown callbacks remain disclosed.
- Known limits: Same-account/laptop backup evidence is local recovery only, not independent production disaster recovery. Changed/unavailable current source authority blocks automatic opening. No total-source-loss/full-volume certification, cloud backup or deployment is introduced.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: local backup/recovery CLI, maintenance integration, real-stack tests and runbook delivered; synthetic targets cleaned and launched services stopped as recorded in execution.
- Next safe action: Khalid's product review or a separately requested SP-22; no cumulative acceptance or production opening is implied.
- During execution: record changed files/migrations, exact checks/results, unresolved defects and repeatable lessons.
- Progression: [SP-22](22-local-final-acceptance.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

