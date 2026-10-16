# SP-22 — Complete local acceptance and performance

Status: technically_accepted locally; product/design review pending  
Date: 2026-10-14  
Priority: 22 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-16; explicit4-process load configuration  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-21](21-local-backup-recovery.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

The complete C01–C14 CRM is reproducible and usable locally with measured performance and full evidence.

- Requirements: C01–C14.
- Business rules: BR-01–BR-31, accepted local H-01/H-02/H-03 and Q-05/Q-06/Q-07/Q-08 defaults.
- Screens/interactions: S01–S17 plus contextual contact/property/password-change support views.
- Acceptance scenarios: AT-01–AT-41, including benchmark AT-28; local variants and real-device limitations recorded separately.
- API boundary: Complete /api/v1 catalogue and local health endpoints; confirm actual OpenAPI/typed client matches the documented contracts.
- Data boundary: Complete reviewed Alembic schema, test/benchmark/recovery fixtures, authorized reports, file manifests and durable worker state.
- Entry prerequisites: SP-21 accepted; all earlier technical gates/evidence available and isolated benchmark dataset provisioned.

The [execution ledger](sp-22-execution.md) and [AT01–41 map](sp-22-acceptance-map.md)
record final results and corrected attempts. Local technical acceptance passes;
product/design and real-device/real-service validation remain separate. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage)
records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes.

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
- [Approved V3 screenshots, route map and rules for unpictured pages](../../04-design/ui-reference/approved-v3/README.md)
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

- [Requirements traceability](../../05-quality/traceability.md)
- [Locust installation and usage](https://docs.locust.io/en/stable/)
- [Playwright installation](https://playwright.dev/docs/intro)
- [Playwright Chrome/Edge browser channels](https://playwright.dev/docs/browsers)
- [Recovery contract (local sections only)](../../06-delivery-and-operations/release-and-recovery.md)
- [KAY Bklit chart guide](../../04-design/charts.md)
- [KAY design system](../../04-design/design-system.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Complete any missing core UI states and local setup/run instructions; eliminate temporary mock CRM responses in completed workflows.
- [x] Run full French desktop/mobile keyboard/touch/zoom/accessibility coverage and local next build plus production-mode browser smoke.
- [x] Check shadcn/Tailwind/Bklit provenance, navigation links, column preferences and safe expired-session recovery across all screen families.

## Backend tasks

- [x] Run complete pytest/Ruff/mypy/regression against real PostgreSQL, worker, local storage/scanner and signed simulator.
- [x] Generate deterministic benchmark data into the isolated benchmark database and execute Locust with recorded read/write mix, warmup and steady duration.
- [x] Verify migration-from-clean-install, restart persistence, worker recovery and local restore instructions; fix regressions before acceptance.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Use 100 synthetic accounts, 200,000 contacts and 20,000 physical properties including hierarchy units; record development/type distribution separately.
- [x] Review query plans/indexes and rerun workload after fixes; never use the user's development data as the benchmark target.

## Testing tasks

- [x] Map every AT-01–AT-41 scenario/variant to current backend and E2E evidence; include role-negative, race, retry/interruption and restore cases.
- [x] Rerun the cumulative [SP-06 ownership/merge regression](sp-06-evidence.md) across every introduced contact-linked inventory/requirement/deal/task/visit/document module: stable current links, retained origins/actors, no automatic collaborator union, current denial, retry and rollback. Every contact-FK table needs a reviewed strategy in the same merge path; an unregistered link must fail closed.
- [x] Run visible Chrome end-to-end journey from admin/user/login through leads, inventory/files, requirements/deal/reservation/close, calendar/reminders, finance/dashboard/import/export and simulator intake.
- [x] Run Chrome/Edge desktop and mobile Chromium/WebKit profiles; record actual iOS Safari device checks as not run when no real device is available.
- [x] Measure p95 ordinary API ≤1 second and dashboard ≤2 seconds at 100 concurrent users; publish dataset/hardware/load mix/duration and local recovery result.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Every applicable local core acceptance variant passes; no unresolved defect breaks the defined local workflows.
- [x] Documented load volume and p95 targets pass; local RPO/RTO evidence remains valid. Do not silently reduce targets to obtain a pass.
- [x] Fresh locked install/start/test instructions reproduce the working local stack and data survives restart.
- [x] Technical acceptance is recorded separately from Khalid's product review and from real-device/real-service validation outside local scope.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Demonstrate the full cumulative CRM journey in visible real Chrome, then inspect role separation and console/network behavior across the implemented screens.

## Verification evidence

Final observed results are summarized below; the linked execution ledger retains
exact commands, failures/corrections, source fingerprint and local limits.

| Boundary | Current result | Evidence |
|---|---|---|
| Frontend lint/typecheck/build | PASS | npm lint/typecheck/build exit0; h1B7-HZDzQ3xLkUBgLSC1; fresh npm ci succeeds |
| Backend quality/unit/API | PASS across corrected runs |486 current distinct cases observed passing, not one clean486 invocation; Ruff281 files/mypy177 modules exit0 |
| PostgreSQL/migration/concurrency | PASS locally | RealPG18.2/head0022; empty clean install/populated upgrade repair; current merge/races/retry/permissions124 affected cases; development unchanged |
| Playwright E2E | PASS across corrected runs |130 business+4 focus variants; visible Chrome complete/Edge/mobile Chromium/WebKit; development component1/1 |
| Visible Chrome review | PASS | native5/5, final rebuilt navigation/sheet/family3/3 and final-source restored journey1/1; touch/keyboard/actual200%/six widths |
| UI skills and AFTER audit | PASS at exercised boundary | Three required skills/applicable references and9 V3 originals read; AFTER022 records retained system, per-rule evidence and1 unselected inherited LOW broader-V3 finding, no audit-only fix |
| Security/permission review | PASS locally | Current roles/scope/CSRF/private files/finance/import/intake/replay/restore;285 browser JS/0 configured-secret matches;0 detailed report steps |
| Implementation docs/traceability | Updated and verified |41-AT map,123-path/153-operation actual OpenAPI catalogue, local install/run/load/restore procedure and final ledger |
| AT28 load | PASS with4 API processes |100 accounts/200k contacts/20k physical properties;100 users/60.261s/6285 requests/0 errors; ordinary p95max630.064ms/dashboard1314.907ms |
| Current-source local recovery | PASS small synthetic fixture |RPO3.773923s/restore3.794764s/incident→verified35.976s; not full-volume/source-loss DR |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defects corrected: populated upgrade deferred-FK failure, current-scope query plan, redundant report scans, missing keyboard outline, intake field preservation and stale preview copy. Retained failed/corrected test and load attempts are in the ledger.
- Known limits: No deployment or production-readiness claim. Actual iPhone/Safari, the unidentified real website and real-data policies stay explicitly outside measured local evidence.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Final handoff: local gates verified with the documented4-process performance setting; fresh locked setup, cumulative regressions, current-source recovery and privacy/isolation/shutdown recorded.
- Remaining review: Khalid's product/design approval, inherited broader V3 fidelity, actual devices/website and production remain outside local technical acceptance.
- During execution: record changed files/migrations, exact checks/results, unresolved defects and repeatable lessons.
- Progression: Final local technical handoff and independent product review. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

