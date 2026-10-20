# SP-14 — Working-time settings and visit calendar

Status: technically_accepted; scoped local implementation and verification complete  
Date: 2026-10-14  
Priority: 14 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: accepted locally on 2026-10-15; evidence below  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-13](13-outcomes-reopening.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

An administrator configures work times and staff book three visit types under enforceable schedule and capacity rules.

- Requirements: C01, C07, C13, C14.
- Business rules: BR-16, BR-30, BR-06.
- Screens/interactions: S09, S17.
- Acceptance scenarios: AT-16, AT-40; AT-23.
- API boundary: GET /visit-schedule/policy, POST /visit-schedule/policy/preview, PUT /visit-schedule/policy; visit create/edit/confirm/reschedule/complete/cancel and GET /calendar/free-busy, /calendar/availability.
- Data boundary: visit, visit_participant, visit_schedule_policy, visit_working_window, visit_break_window and schedule/actor history.
- Entry prerequisites: SP-13 accepted; synthetic work policy, contacts/participants and capacity/DST fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-16/40 and the applicable AT-23 variants pass within the recorded SP-14 boundary; SP-15 reminder delivery remains separate.

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

- [Visit scheduling diagram](../../../diagrams/visit-scheduling.mmd)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [Python reference and quality guide](../../reference/python/README.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [PostgreSQL 18 documentation](https://www.postgresql.org/docs/18/)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build Working Hours settings for active weekdays/windows, lunch breaks and company-car hourly capacity; preview affected future visits before saving.
- [x] Build the visit calendar with shadcn controls and a KAY-specific calendar grid/agenda composition; support desktop calendar and readable mobile agenda.
- [x] Provide company_car, without_company_car and office options with work-time/capacity feedback, scoped detail and colleagues' free/busy only.
- [x] Collect an explanation for ordinary appointment overlap; distinguish a hard work-time/capacity rejection that cannot be overridden.

## Backend tasks

- [x] Allow only administrator policy edits; active staff read safe scheduling configuration and capacity.
- [x] Check both off-site types fit work windows and avoid lunch; office visits bypass these gates and the company-car cap.
- [x] Apply the accepted Q-07 local rule: company_car consumes every local hourly interval touched by [start,end), agency-wide cap initially 2; no-company-car does not consume it. Distinguish repeated DST hours by UTC interval/offset.
- [x] Count active scheduled/confirmed bookings, exclude cancelled/completed visits and do not promise a slot for a draft. Lock the policy row for writes and recheck current capacity at booking/reschedule.
- [x] Policy changes report existing future visits for review and preserve them. No configured windows means new off-site booking fails while office booking is possible.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate policy singleton/version, weekday work/lunch rows, visit types/status/timestamps and participant links; use UTC instants plus Casablanca interpretation.
- [x] Validate non-overlapping windows, contained lunch breaks and positive capacity; booking and policy changes share a consistent lock order.

## Testing tasks

- [x] Run AT-16/40 including office on closed days/lunch, both off-site restrictions, administrator-only writes and safe free/busy.
- [x] Test 10:30–11:30 counted in both hours, exact 11:00 end excluded from next hour, DST repeated/skipped intervals and synchronized last-slot claims.
- [x] Browser tests edit policy, preview impact, book/reschedule each type and demonstrate reason-required overlap versus hard rejection.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Office visits are bookable at any time; off-site work windows/lunch and company-car-only agency capacity are enforced by the API.
- [x] Concurrent requests cannot oversubscribe a slot and policy edits do not silently cancel prior visits.
- [x] Calendar/settings pass role, timezone, API, browser and accessibility checks.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Configure a synthetic schedule as administrator, then book all three types as agent and inspect free/busy and capacity errors.

## Verification evidence

Implementation, failed attempts, corrected reruns, exact commands and final
gates are recorded in [SP-14 execution](sp-14-execution.md) and the
[QA register](../../QA_COMMANDS.md#sp-14-final-verification-2026-10-15-utc).

| Boundary | Final local result | Evidence / boundary |
|---|---|---|
| Frontend lint/typecheck/build | pass, exit0 | Optimized build `0leBHja-rs4ZKz21C7tSq`; unchanged through final compiled checks |
| Backend quality/unit/API | pass, exit0 | Explicit venv; Ruff179 files, mypy113 modules; full349/349 in685.01s,94% coverage,0 skipped; focused31/31 |
| PostgreSQL/migration/concurrency | pass | Both56 tables/head0016/no drift; distinct verified OIDs; populated migration, real synchronized capacity/policy races, UTC/DST and retention negatives |
| Playwright E2E | pass, exit0 | Clean65/65 across Chromium/Chrome/Edge/Firefox/WebKit; broader compiled Chrome14/14;0 skipped |
| Visible Chrome review | pass | Final1/1;23 inspected native captures; administrator/agent/denied roles,320–1440px, keyboard/native touch/actual200%, retained failure and version recovery |
| UI skills and AFTER audit | pass within UI scope | Required full reads and exclusions recorded; existing KAY tokens/components preserved; AFTER014 zero new findings; fresh finish reviewer ship, documenter factual component addition |
| Security/permission review | scoped checks pass | Current authority after waits/replay, safe busy-only projection, strict transport, rollback/history; Python/runtime npm audits clean,9 inherited HIGH dev-tool advisories retained |
| Implementation docs/traceability | pass | Concrete scheduling/API/data/screen/acceptance contracts and final link validation; verified test cleanup/privacy and project shutdown |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- No unresolved required SP-14 failure is carried as a pass. Corrected cleanup, fixture, geometry and inherited supervisor-readiness failures remain in the execution ledger. The original readiness assertion is unchanged; fixed test lifecycle passes three consecutive repeats and the clean five-target matrix.
- Retained risks:9 inherited HIGH development-tool dependency advisories; one non-fatal Windows10054 callback warning in the passing broader file regression; pre-existing missing generic Impeccable PRODUCT/design.json metadata. No audit-only unselected fix or broad metadata repair was made. Human product/design review remains pending.
- Known limits: No vehicle/fleet assignment module. Reminder delivery and overdue visit/task work arrive in SP-15. Local WebKit/touch is not real-device Safari or assistive-technology certification; no load/recovery/production acceptance is claimed.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: working-hours impact preview, all three visit types/lifecycle, desktop calendar/mobile agenda and safe colleague busy intervals are implemented. Backend-authoritative Casablanca resolution avoids the observed local Node/PostgreSQL tzdata mismatch. Development migration was additive, never seeded/reset.
- Shutdown: project listeners3000/8000/3100/8100/8101/3310 and root-identified service processes0; ClamAV stopped with cache retained, shared PostgreSQL/unrelated resources preserved. Test53 record tables empty/bootstrap unset/intrinsic capacity2/no hours; final cleanup removed0 rows/0 old orphan objects.
- Next safe action: Khalid reviews the existing French interface, or requests SP-15 implementation. SP-15–SP-22 and whole-CRM acceptance remain pending.
- Progression: [SP-15](15-tasks-reminders-notifications.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

