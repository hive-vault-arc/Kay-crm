# SP-17 — Dashboard, KPIs, and exception lists

Status: technically_accepted; scoped local technical gate passed; product review pending  
Date: 2026-10-14  
Priority: 17 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: 2026-10-15; [execution evidence](sp-17-execution.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-16](16-commissions-collections.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

The dashboard reports real authorized CRM outcomes with correct attribution and useful Bklit charts.

- Requirements: C10, C13, C14.
- Business rules: BR-05, BR-18, BR-19, BR-28, BR-29.
- Screens/interactions: S02 and scoped drill-down/detail links.
- Acceptance scenarios: AT-18, AT-19, dashboard/count portions of AT-36/39; AT-23.
- API boundary: GET /reports/dashboard, /reports/exceptions, /reports/activities and identically scoped drill-down routes.
- Data boundary: assignment_event, deal_outcome.primary_agent_at_close_id, timeline_event actors, inventory reconfirmation and authorized aggregate projections.
- Entry prerequisites: SP-16 accepted; timestamped attribution, outcome/finance and 30/14-day fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. Implemented variants pass as recorded in [the execution ledger](sp-17-execution.md); no later-sprint or whole-product coverage is inferred.

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

- [KAY Bklit chart guide](../../04-design/charts.md)
- [KAY design system](../../04-design/design-system.md)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Replace initial dashboard states with real KPIs and Bklit chart wrappers installed from the reviewed registry; no alternate chart stack.
- [x] Render accessible values/tables alongside charts, French MAD/date formatting and explicit metric/period/denominator labels.
- [x] Add exception lists for 30-day stale inventory and 14-day inactive deals; loading/empty/error/denied chart states do not break the shell.

## Backend tasks

- [x] Compute portfolio by current primary agent, results by agent at close and activity by true contributor.
- [x] Filter before aggregation; agents see assigned/collaborative work, not agency-wide inventory totals merely because shared inventory is readable elsewhere.
- [x] Keep development, physical-unit and offering-level counts separate; stale alerts flag records without automatic loss/withdrawal.
- [x] Return authorized aggregated series with period/timezone/unit and stable drill-down contracts.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Review/reporting indexes with explain plans on synthetic data; preserve snapshots required for attribution.
- [x] Keep metric computation authoritative in backend/PostgreSQL and avoid client aggregation of unrestricted records.

## Testing tasks

- [x] Run AT-18/19 around transfer, collaborators, reopenings and 29/30-day or 13/14-day boundaries.
- [x] Compare every chart value with API and tabular rendering; test empty/zero series, long labels and permission-safe counts under AT-36/39.
- [x] Chrome tests manager versus agent dashboard, date filters, drill-downs, Bklit tooltips/accessibility and responsive states.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Manager/administrator agency data and agent-scoped work are accurate through all totals and drill-downs.
- [x] Bklit charts match authorized API values and expose accessible numeric alternatives.
- [x] Attribution/count/alert, browser and accessibility checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Compare synthetic manager and agent dashboards, open drill-downs, change periods and verify chart/table agreement.

## Verification evidence

Actual commands, versions, retained failed attempts, fixes and final artifacts are in [SP-17 execution](sp-17-execution.md) and [QA commands](../../QA_COMMANDS.md). Focused necessary-only checks retain valid evidence for untouched boundaries; no full-suite rerun is claimed.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | exit0; final build17tAhAG5Fge1gVrvm-G9w | Actual command, working directory, versions, exit/result |
| Backend quality/unit/API | Ruff/format/mypy exit0;22/22 focused new/affected pytest passed,0 skipped | Venv interpreter, exact command and assertions |
| PostgreSQL/migration/concurrency | Distinct test identity; read-only repeatable snapshot/transfer and revocation cases pass; both head0018/no new migration | Isolated database identity, schema version, cases/results |
| Playwright E2E | 10/10 five-target report flows; final affected F1 Chrome2/2 pass; no final full-matrix rerun claim | Scenario IDs, browser/project, dataset, trace or safe observations |
| Visible Chrome review | Final F1 headed1/1 pass; native11+2 captures, keyboard/touch/six widths/actual200%,0 unexpected errors | Actual Chrome, viewport, actor, interactions, console/network result |
| UI skills and AFTER audit | Complete required reads, system-first incumbent composition; detector[]; AFTER017 optional LOW1 unselected; F1 resolved and documenter complete | Three skills read; per-surface applicability; reused system parts; visual evidence; audit path/findings and actual selection/approval |
| Security/permission review | Scope before aggregates/pages; agent finance denied; strict facade/session/invalid/retry negatives and transfer snapshot pass | Applicable boundary and negative-case evidence, or justified N/A |
| Implementation docs/traceability | Concrete reporting/API/data/architecture/traceability/component/QA contracts linked and updated | Changed contracts and linked evidence |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Required defects corrected: explicit enquiry joins, fixture contract mistakes, 44px hit regions, Escape scope, settled resize measurement and retained server-default dates. Failed attempts and superseding passes remain in [execution](sp-17-execution.md).
- Known limits: No invented activity from unrecorded external calendars/calls/payments. Benchmark target is measured comprehensively in SP-22.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Implemented: authorized report projections, Bklit chart/table pairs, period filters, stable scoped drill-downs and 30/14-day current exception lists. Existing work/inbox/visit flows retained; no schema migration.
- Remaining nonblocking limits: AFTER017 mobile-table density finding1 unselected;9 inherited HIGH development-tool npm advisories; inherited PRODUCT/design.json gaps not repaired. Runtime npm audit0. Product/device/load/recovery/production/full-product review is not inferred.
- Final handoff: technical acceptance is complete locally. Development data is unchanged; isolated synthetic fixtures cleaned and project services stopped. The next authorized implementation slice is SP-18, not included here.
- Progression: [SP-18](18-atomic-contact-import.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

