# SP-13 — Outcomes, inventory effects, and reopening

Status: technically_accepted; scoped local SP-13 gates passed  
Date: 2026-10-15  
Priority: 13 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed; all23 applicable criteria evidenced  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-12](12-reservations-overlap.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Closing and reopening deals maintain accurate inventory, original outcomes and manager-review boundaries.

- Requirements: C04, C08, C09, C13, C14.
- Business rules: BR-10, BR-11, BR-12, BR-13, BR-14, BR-27, BR-28.
- Screens/interactions: S08 outcomes/reopen; S11/S12 and property stock states.
- Acceptance scenarios: AT-10, AT-11, close portions of AT-12, AT-13, commission-free AT-14, AT-34; AT-23.
- API boundary: POST /deals/{id}/close, /reopen; manager /properties/{id}/external-outcome and /developments/{id}/external-outcome; stock-review conflict responses.
- Data boundary: deal_outcome, deal_stage_event, primary_agent_at_close_id, offering/reservation state history, audit/outbox and competing-deal flags.
- Entry prerequisites: SP-12 accepted; sold/leased-child and intervening-stock fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. [The execution record](sp-13-execution.md) records passing final gates and retained corrected attempts; technical acceptance is complete for the scoped local slice.

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

- [Deal state diagram](../../../diagrams/deal-states.mmd)
- [Offering state diagram](../../../diagrams/offering-states.mmd)
- [Inventory hierarchy diagram](../../../diagrams/inventory-hierarchy.mmd)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Implement won/lost/cancelled forms with amount/date/explanation where required; make commission optional.
- [x] Show external-outcome manager controls, inventory effects preview, flagged competing deals and a safe manager-review message.
- [x] Provide scoped reopen confirmation with reason and history; never silently overwrite a prior outcome.

## Backend tasks

- [x] Close atomically with required fields, contact authority, reservation/current stock and project/unit checks; capture responsible agent at close.
- [x] Apply sale withdrawal/rental occupancy rules and explicit project-to-unit effects; flag other deals without closing them.
- [x] For a previously sold/leased child, reject whole-development close as PARTIAL_DEVELOPMENT_REVIEW_REQUIRED; retain a review path without an invented override.
- [x] Reopen under current stock checks and preserve original outcomes. Later commission records must remain intact; rerun these invariants after SP-16.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate immutable outcomes, snapshots, linked reopen/stage history and stock-effect events.
- [x] Use development/offering locks for close/external outcome/reopen; financial correction is never an automatic side effect.

## Testing tasks

- [x] Run AT-10/11/12/13/34 for sale/rent combinations, old rental history, partial developments and intervening stock changes.
- [x] Prove no-commission closing under AT-14 and synchronized close/reservation/reopen races.
- [x] Browser tests close with missing/valid fields, inspect competing flags, reopen an allowed deal and observe review-required conflicts.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Amount/date/reason and stock invariants hold; external outcomes create no KAY win/income.
- [x] Reopening preserves the original and restores stock only when current state permits.
- [x] Partially committed developments remain blocked for review; all relevant checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Close a synthetic deal, inspect resulting offerings/history, reopen it, and demonstrate a blocked whole-development close.

## Verification evidence

Implementation is present. The following records actual progress; no final technical exit is claimed before the remaining gates pass. Exact commands and retained attempts are in [the execution record](sp-13-execution.md).

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | Final optimized build7M8Dzh4lJCpDJgX2UM3FC; lint/types/build exit0 |
| Backend quality/unit/API | pass |318/318 full pass681.74s,94% coverage,0 skipped; affected51 and Ruff/format/mypy pass |
| PostgreSQL/migration/concurrency | pass |0015 additive development/test;48 tables; real races/history/SQL/populated migration checks pass |
| Playwright E2E | pass | Compiled five-target50/50 pass17.4m; broader Chrome8/8 pass2.8m;0 skipped |
| Visible Chrome review | pass | Full headed1/1 pass1.5m; settled/refresh1/1 pass33.0s;16 valid native captures and actual200% |
| UI skills and AFTER audit | scoped pass | Required reads/system reuse; detector[]/AFTER013 zero findings; fresh UI reviewer ship/documenter No system changes; inherited metadata drift retained |
| Security/permission review | pass at local boundary | Strict scope/retry/current authority/SQL;277 JS/0 configured secrets; final report6 JSON/8 arrays/0 detailed; isolated cleanup and project shutdown pass |
| Implementation docs/traceability | pass | Contracts/traceability/QA/lessons updated; validator1078 links/22 sprints/41 AT mappings/13 Mermaid pairs/9 JSON examples |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: corrected attempts and passing final gates are retained in [the execution record](sp-13-execution.md). Residual9 inherited HIGH development-tool advisories, metadata drift and non-fatal Windows Proactor10054 are disclosed, not claimed fixed.
- Known limits: Expanded transactions for a remaining subset of a partly committed development are outside the accepted local policy; Q-06 remains for later business expansion.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Current handoff: SP-13 is implemented and technically accepted at the local synthetic boundary; product/design review remains pending Khalid.
- Next safe action: Khalid's product review or SP-14 implementation. SP-14–SP-22 and full-product/load/recovery/production acceptance are not complete.
- During execution: record changed files/migrations, exact checks/results, unresolved defects and repeatable lessons.
- Progression: [SP-14](14-visit-calendar-working-times.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

