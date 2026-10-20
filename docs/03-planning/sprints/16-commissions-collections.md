# SP-16 — Optional commissions and collections

Status: technically_accepted locally; scoped evidence in the execution record  
Date: 2026-10-14  
Priority: 16 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: accepted2026-10-15 UTC; applicable local gates verified  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-15](15-tasks-reminders-notifications.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Managers recognize, collect and correct optional commissions with exact balances and preserved originals.

- Requirements: C09, C08, C13, C14.
- Business rules: BR-13, BR-14, BR-15.
- Screens/interactions: S08 manager/administrator finance tab.
- Acceptance scenarios: AT-14, AT-15; financial-preservation portion of AT-13; AT-23.
- API boundary: GET/POST /deals/{id}/commissions, POST /commissions/{id}/recognize, /receipts, /correct.
- Data boundary: commission, commission_revision, receipt, exact numeric values and valid-receipt-derived balance.
- Entry prerequisites: SP-15 accepted; closed/reopened deals with synthetic Decimal financial fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. SP-16 implemented variants pass in the execution record; complete cross-sprint/final-product acceptance remains separate.

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

- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [Python reference and quality guide](../../reference/python/README.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Add optional fixed/percentage commission forms with an explicit base and expected/recognized states.
- [x] Provide manager/administrator recognition, partial-receipt and correction controls with current balance and explanatory validation.
- [x] Keep agent finance fields/API details inaccessible, and ensure no commission prompt blocks a normal deal close.

## Backend tasks

- [x] Use Decimal for base/rate/amount with no binary-float or intermediate rounding; round the final calculated MAD amount once to two decimals using ROUND_HALF_UP and record that local calculation policy in model/API examples.
- [x] Enforce manager/administrator reads and writes, optional commission everywhere and explicit recognition separate from collection.
- [x] Lock the commission, recheck recognized balance and reject over-collection; corrections link original/replacement with reason/actor.
- [x] Reopening a deal requests financial review without erasing commission or receipt facts.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate exact commission/base/rate fields, linked immutable revisions/receipts and transactional balance constraints.
- [x] Do not store balance as an independently editable field; derive it from valid recognized amounts and retained corrections.

## Testing tasks

- [x] Run AT-14/15 with no commission, fixed/percentage, partial receipts, over-collection and retained corrections.
- [x] Force concurrent receipt attempts and retries to prove one recognized balance cannot be over-collected.
- [x] Rerun reopen AT-13 with existing financial records; browser tests manager actions and agent API/UI denial.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] A deal closes without commission; only manager/administrator manage finance.
- [x] Collections cannot exceed the recognized balance, even under races/retries, and corrections preserve originals.
- [x] Backend finance/reopen regression, E2E and Chrome checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Recognize an optional commission, record a partial receipt, reject an excess, correct it, and inspect agent denial.

## Verification evidence

Current implementation, necessary-only verification plan and actual results are
recorded in [SP-16 execution](sp-16-execution.md). Rows below summarize the completed local gates, with
commands, corrected attempts and limitations in that execution record.

All results below are observed local checks, not production, whole-product or human approval.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | npm lint/types/build exit0; final build2sQCC1Lb3eIrWjWd7hTMQ |
| Backend quality/unit/API | pass | Explicit venv Ruff/format211 files/mypy132 modules; focused46/46 passed79.77s,0 skipped |
| PostgreSQL/migration/concurrency | pass | Both63 tables/head0018/no drift; actual two-connection races/retries; populated upgrade/retention and additive development migration |
| Playwright E2E | pass | Finance10/10 across five targets; final affected Chrome2/2; synthetic real-stack AT-13/14/15/23 variants |
| Visible Chrome review | pass | Final1/1 in39.0s; native14 captures, touch/keyboard/six widths/actual200%,0 unexpected errors |
| UI skills and AFTER audit | pass at scoped boundary | Complete required reads/applicability, incumbent system; one detector[]; AFTER016 zero new aesthetic findings; fresh scored copy fix resolved/ship and factual documenter |
| Security/permission review | pass at scoped boundary | Current M/A/agent denial, revoked-after-wait replay, Decimal/SQL balance/immutability, strict HTTP/CSRF, versioned proof, privacy and isolated cleanup |
| Implementation docs/traceability | complete | Finance contract/API/model/screen/security/traceability/QA/index/roadmap/backlog and repeatable lesson updated |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: recorded fixture/selector/measurement failures corrected; final required gates pass. Inherited metadata/dev-tool risks and unverified product/device/load/recovery/production remain explicit.
- Known limits: No banking, payroll or official accounting features.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: exact finance vertical slice, four-table0018 and real French Finance tab implemented;46 focused backend/10 five-target variants/final Chrome/headed and schema/security/privacy gates pass at recorded boundaries.
- Next safe action: Khalid reviews the delivered Finance workflow; SP-17 remains unstarted and requires its own task.
- Execution: source/build hashes, concrete proposals, actual commands/versions, corrected attempts, limits and final cleanup are retained in the linked record.
- Progression: [SP-17](17-dashboard-kpis.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

