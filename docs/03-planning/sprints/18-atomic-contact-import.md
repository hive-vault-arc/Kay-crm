# SP-18 — Atomic contact import

Status: technically_accepted; scoped local gate passed; product review pending  
Date: 2026-10-14  
Priority: 18 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed2026-10-15 UTC; [execution](sp-18-execution.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-17](17-dashboard-kpis.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Managers preview and correct a contact CSV, then commit every eligible new row atomically.

- Requirements: C11, C02, C13, C14.
- Business rules: BR-03, BR-04, BR-20.
- Screens/interactions: S03 Leads import action and contextual import workflow.
- Acceptance scenarios: AT-20, AT-21; AT-23.
- API boundary: POST /imports, GET /imports/{id}, POST /imports/{id}/preview, /approve with preview_hash, retry key and optional explicit fallback agent.
- Data boundary: import_batch, import_row, protected raw import file, contact/phone identity and batch result/history.
- Entry prerequisites: SP-17 accepted; synthetic CSV fixtures and disposable isolated import database.

The listed acceptance coverage is limited to this sprint's implemented AT-20/21/23 variants; focused executable checks pass. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. The shared frontend gate applies; neither technical acceptance nor test evidence implies Khalid's product/design review.

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

- [Atomic import diagram](../../../diagrams/import-atomic.mmd)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Python reference and quality guide](../../reference/python/README.md)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build import action, file validation, row-numbered preview, skipped-existing/errors and corrected-file resubmission.
- [x] Expose active agent-per-row/fallback selection and block approval while any invalid row remains.
- [x] Show committed/rolled-back/repreview-required states and preserve the approved result on retry.

## Backend tasks

- [x] Accept the documented UTF-8 exact-header contact CSV only; enforce manager/administrator authority, phone normalization, agent validity and proposed 20 MB/50,000-row limits.
- [x] Skip an entire existing-phone row and find duplicate new phones within the batch; validate/correct before approval.
- [x] Recheck authorization, agents, phones and preview hash; insert every eligible new contact/history/result in one transaction.
- [x] Treat a new concurrent phone claim as a full rollback requiring repreview; same approved batch/key retry returns its original durable result.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate batch/row/preview/result records and compatible phone locks; no partial batch contacts on failure.
- [x] Retain safe batch evidence and protect raw data; do not add an inventory-import schema.

## Testing tasks

- [x] Run AT-20/21 valid/skipped/invalid mix, wrong role, invalid agent, duplicate intra-file phone and CSV quoting/unicode cases.
- [x] Force pre/post-commit interruption and concurrent phone claim with real separate database sessions.
- [x] Browser tests preview, correct, approve, inspect report and handle an approval/retry conflict.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Invalid input blocks approval and eligible contacts preserve the row's assigned agent.
- [x] The approved new rows commit completely or not at all; interruption/retry never duplicates them.
- [x] Import API/database race, E2E and visible Chrome checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review performed: synthetic mixed CSV, wrong file, transfer cancellation/retry, corrected rows/agent mapping, explicit approval, skipped/committed report, reload, relevant denial/error states, keyboard/touch/mobile/actual200% zoom.

## Verification evidence

Actual scoped commands, corrected attempts, timing/build/digests and limitations are retained in [execution](sp-18-execution.md) and the [QA register](../../QA_COMMANDS.md). Overlapping reruns are not added as extra unique tests. The user requested necessary-only checks, not a full CRM rerun.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | PASS | all exit0, build KDcVSGWqFB2pc9tcjQcfF;410-file digest in execution |
| Backend quality/unit/API | PASS | explicit venv; Ruff check/format231,mypy147;61 focused cases110.43s; strengthened16/16 and final HTTP3/3 overlapping reruns,0 skipped |
| PostgreSQL/migration/concurrency | PASS | real separate-session claim,501-contact chunk rollback/postcommit retry, populated0018 preservation;0019 both DBs/no drift; development unchanged0 records |
| Playwright E2E | PASS | compiled Chrome4/4 including two affected ordinary contacts; after refresh-only fix affected import2/2 in59.1s,0 skipped; AT-20/21/23 variants |
| Visible Chrome review | PASS | headed1/1 in30.1s; Chrome155.0.8059.79;320–1440,actual200%,controls≥44px,contrast≥5.814:1; unexpected errors0;12 originals+2 canonical validated |
| UI skills and AFTER audit | PASS | all three required reads, dense admin/form exclusions; shared KAY shadcn/Tailwind; Bklit N/A; [AFTER018](../../../anti-slop/audit-018-2026-10-15.md)0 new findings; fresh finish ship/documentation |
| Security/permission review | PASS | current M/A before lookup/replay, session-bound private upload, agent/phone/hash recheck, strict transport, immutable origin/history, privacy/fixture isolation; see SECURITY_CHECK |
| Implementation docs/traceability | PASS | concrete import API/data/UI contract, migration, acceptance/traceability, QA and execution updated |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Corrected defects: audit prefix, imported-contact read provenance, truthful unknown outcome, explicit cleared row agent, stale same-batch preview after cancellation/retry; harness-only corrections retained separately in execution. No required check remains failed/skipped.
- Known limits: This sprint imports contacts only. Production/raw-file retention decisions remain separate from synthetic local test cleanup.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: backend imports module/additive0019, French Leads import vertical slice, targeted tests and documentation implemented. Both verified DBs head0019; development records untouched, isolated test data/files cleaned, project services stopped; shared PostgreSQL preserved.
- First safe next action: Khalid's product review, or SP-19 when requested. Broader V3 implementation, real-device/Safari, full CRM/load/recovery and production/real-data retention are not accepted by this slice.
- During execution: record changed files/migrations, exact checks/results, unresolved defects and repeatable lessons.
- Progression: [SP-19](19-search-export-archive-audit.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

