# SP-15 — Tasks, reminders, and internal notifications

Status: technically_accepted; scoped local gates passed, product review pending  
Date: 2026-10-14  
Priority: 15 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: accepted locally on 2026-10-15; evidence below  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-14](14-visit-calendar-working-times.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: implementation/migration details are verified locally; reminder recipient choices remain explicit technical proposals subject to product review.  

## Goal and traceability

Staff manage current/overdue work and receive durable internal reminders that survive retries and worker restarts.

- Requirements: C06, C07, C10, C13, C14.
- Business rules: BR-16, BR-17, BR-05, BR-06.
- Screens/interactions: S02 tasks panel, S05/S08 tasks, S09 reminders and visit follow-up.
- Acceptance scenarios: AT-17; applicable AT-16 scope; AT-23.
- API boundary: GET/POST /tasks, GET/PATCH /tasks/{id}, /complete, /cancel, GET /notifications; visit reschedule/cancel/complete invalidation.
- Data boundary: task, job, outbox_event, notification and visit schedule_version distinct from agency policy version.
- Entry prerequisites: SP-14 accepted; SP-09 worker infrastructure and controllable clock fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The implemented AT-16/17/23 variants pass locally as recorded below; this is not whole-product or human acceptance.

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

- [FastAPI larger applications](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/bigger-applications.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Python reference and quality guide](../../reference/python/README.md)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build today's/overdue task panels and detail-context create/edit/complete/cancel controls.
- [x] Add internal notification list/read state, accessible pending/error states and overdue unresolved visit follow-up.
- [x] Show only currently permitted record links and safe message text; no external email/SMS/chat workflow.

## Backend tasks

- [x] Extend the existing SP-09 outbox/job worker with one-day/one-hour visit reminders and task-due notifications.
- [x] Use dedupe key (visit_id, reminder_type, visit schedule_version); invalidate stale jobs on time/status changes.
- [x] Claim bounded jobs with leases/fencing and retry/backoff; commit notifications idempotently and recheck recipient current scope before delivery.
- [x] Use a controlled clock for due-time tests; keep actual time interpretation in Africa/Casablanca and actor attribution intact.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Add task due/state/owner fields and notification/job keys/indexes; business changes and reminder events commit atomically.
- [x] Maintain one unique notification per recipient/event, retained history and invalidated schedule versions.

## Testing tasks

- [x] Run AT-17 with worker stop, crash after effect/before acknowledgement, retries, reschedule/cancel/complete and overdue lists.
- [x] Verify reminder delivered once under concurrent worker claims; permission removal prevents stale private notification details.
- [x] Browser tests create/complete a task, inspect due/overdue notification and confirm rescheduled visit reminders follow the new schedule.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Today's/overdue tasks and internal notifications are usable and scope-correct.
- [x] J−1/H−1 and task due reminders survive restart/retry without duplicates; obsolete work is invalidated.
- [x] Real worker/PostgreSQL integration, E2E and visible Chrome checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Create and complete tasks, use controlled synthetic due times to observe reminders, and inspect a rescheduled/cancelled visit notification.

## Verification evidence

Implementation, failed attempts, corrected reruns and final gates are recorded
in [SP-15 execution](sp-15-execution.md), the [concrete contract](../../04-design/tasks-reminders-local.md)
and the [QA register](../../QA_COMMANDS.md#sp-15-verification-2026-10-15-utc).

| Boundary | Final local result | Evidence / boundary |
|---|---|---|
| Frontend lint/typecheck/build | pass, exit0 | Final build S5SnyXhT5J3phRg8k_fNM; unchanged311-file application/migration fingerprint through cleanup |
| Backend quality/unit/API | pass, exit0 | Explicit venv; Ruff196 files/mypy125 app modules; full372/372 in727.34s,94% coverage,0 failed/0 skipped |
| PostgreSQL/migration/concurrency | pass | Both59 tables/head0017/no drift; distinct verified OIDs; populated migration/history retention, two-connection claims, actual delivery lock-wait rechecks and process crash/restart |
| Playwright E2E | pass through corrected runs | Final affected45/45, roles5/5 and broader Chrome14/14;95 distinct five-target variants plus14 broader, not one clean109 run. Initial79/1/5 and corrected WebKit3/3 retained |
| Visible Chrome review | pass, exit0 | Final2/2 in1.2m;23 refreshed native captures, actual200%,320–1440, keyboard/touch/focus, retained failure/version recovery and permitted/denied roles |
| UI skills and AFTER audit | pass within UI scope | Required complete reads/exclusions, shared KAY shadcn/Tailwind geometry; Bklit N/A without charts; AFTER015:0 new aesthetic findings/per-item gate; single scored French-copy fix resolved, factual documenter addition |
| Security/permission review | scoped checks pass | Current authority after waits/replay and before inbox counts/links, SQL guards/CSRF/no-store/private IDs; Python/runtime npm audits clean,9 inherited HIGH dev-tool entries retained |
| Implementation docs/traceability | pass | Concrete task/reminder/API/data/screen/acceptance contracts and validated links; final privacy/isolation/shutdown recorded |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- No unresolved required SP-15 failure is reported as passed. Incorrect field/navigation assertions, intercepted-request teardown and inherited WebKit navigation readiness were corrected and rerun; original console assertions remain intact. All attempts remain in the execution ledger.
- Retained risks:9 inherited HIGH development-tool dependency entries; one non-fatal Windows10054 callback warning in the passing broader regression; inherited missing generic Impeccable PRODUCT/design.json metadata. No forced package change, broad metadata repair or unselected aesthetic fix.
- Known limits: No external messaging or calendars. FastAPI background tasks alone cannot replace the durable worker.
- Real-device Safari, assistive-technology, load, backup/recovery, production and whole-CRM acceptance are not established by these local checks. Reminder recipients remain explicitly documented technical proposals for product review.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: contextual tasks, today's/overdue work, internal inbox/read state, same-visit follow-up and durable current-schedule reminders are implemented in the existing French KAY interface. Migration0017 is additive; development is never reset/seeded.
- Shutdown: six project ports3000/8000/3100/8100/8101/3310 and root-identified service processes have0 listeners/processes. ClamAV stopped/cache retained; shared PostgreSQL5432 and unrelated resources preserved. Both databases have56 empty record tables/bootstrap unset; intrinsic policy remains version1/capacity2/no hours.
- Next safe action: Khalid reviews the implemented workflow, or requests SP-16. SP-16–SP-22 and full-product acceptance remain pending.
- Progression: [SP-16](16-commissions-collections.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

