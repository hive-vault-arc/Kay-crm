# SP-06 — Ownership, collaboration, and contact history

Status: technically_accepted; scoped local implementation and exit gates passed  
Date: 2026-10-15  
Priority: 06 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-15; see [execution evidence](sp-06-evidence.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-05](05-leads-contact-identity.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Assignments and collaboration change current access while contact history retains its true authors.

- Requirements: C02, C05, C14, C13.
- Business rules: BR-04, BR-05, BR-06, BR-23, BR-29.
- Screens/interactions: S03/S05 contact views; contextual contact detail and timeline.
- Acceptance scenarios: merge variants of AT-04, AT-05; contact portions of AT-24; AT-23.
- API boundary: POST /contacts/{id}/assign, PUT /contacts/{id}/collaborators, GET /contacts/{id}/timeline, POST /contacts/{id}/notes, GET /contacts/{id}/assignment-events, /archive, /restore.
- Additional API boundary: POST /contacts/{id}/merge with explicit survivor, expected versions, reason and retry key; same-scope agents or manager/administrator for cross-portfolio merge.
- Data boundary: contact_collaborator, assignment_event, timeline_event, enquiry.assigned_agent_id, contact.archived_at and record versions.
- Entry prerequisites: SP-05 accepted; primary/collaborator/private contact and immutable-history fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants, now verified in the execution evidence. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. Later-module and full-product scenarios are not accepted by inference.

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

- [Operational glossary](../../02-requirements/glossary.md)
- [FastAPI dependency injection](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/dependencies/index.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Add Contacts view within Leads and contact detail tabs for identity, enquiries, timeline and assignment history.
- [x] Provide manager assignment/collaboration controls with impact preview and true-actor event labels.
- [x] Add recoverable contact archive/restore and French denied/conflict states; keep inquiry/deal links stable.
- [x] Add an authorized merge preview/confirmation showing identity/link impact within the actor's permitted scope.

## Backend tasks

- [x] Enforce primary/collaborator scope on reads and writes; manager/administrator-only assignment, collaboration and archive/restore.
- [x] Record previous/new assignee and actor in immutable history; transfer clears/reassigns enquiry assignments that lose contact scope.
- [x] Implement notes/manually logged interactions with exact author attribution; remove access after transfer without altering historical events.
- [x] Merge authorized contacts under phone/contact locks in one transaction, preserve survivor/source provenance and true actors, reparent current links, and recalculate access without automatically unioning collaborator lists. A failed merge leaves both originals intact.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate collaboration uniqueness and assignment/timeline constraints; transfer contact scope/enquiry assignment/history in one transaction.
- [x] Keep archived references and ON DELETE RESTRICT historical relationships; no automatic contact expiry.
- [x] Keep the merged source recoverably identifiable in history. Extend the same merge service to later requirement/deal/task/visit/document links as those modules are introduced; rerun the cumulative merge regression in SP-22.

## Testing tasks

- [x] Run AT-05 across transfer, collaborator removal and former-agent denial; add shared authorship checks.
- [x] Test contact archive/restore and historical FK preservation under AT-24.
- [x] Test confirmed same-scope and manager cross-portfolio merge, agent cross-portfolio denial, conflicting phones/versions, retry and rollback with original authorship preserved.
- [x] Browser tests change assignment, contribute as collaborator, refresh old agent session, inspect history and restore a contact.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Current authorization changes immediately after assignment/collaboration changes.
- [x] Every historical action remains attributed to its real actor and invalid enquiry assignment cannot leak access.
- [x] Archive/restore preserves contact relationships; relevant backend/E2E/Chrome evidence passes.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Switch between synthetic agents and manager; contribute, transfer, verify denied old access, then inspect and restore history.

## Verification evidence

Execution completed on2026-10-14–15 UTC with synthetic data and the verified isolated PostgreSQL target. Exact commands, corrected failures, versions and limitations are in the linked execution record and QA register.

| Boundary | Current result | Evidence |
|---|---|---|
| Frontend lint/typecheck/build | passed | Lint/types/build exit0; build LnThz-vzAWUFV10tL8i1U; built HTTPS24/24. |
| Backend quality/unit/API | passed | Explicit venv; Ruff69 files,mypy43 modules;126/126 tests,97% coverage,zero skipped. |
| PostgreSQL/migration/concurrency | passed | Head0006 on inspected development/test;17 tables; empty/populated active+disabled upgrades, downgrade refusal, real separate-connection races and rollback. |
| Playwright E2E | passed |155/155 five-browser cumulative cases;5/5 affected cases after narrow mobile correction; zero skipped. |
| Visible Chrome review | passed |36/36 headed; true authors/transfer/denial/restore/merge,320–1440px,touch,keyboard and actual200% zoom;14 inspected synthetic captures. |
| UI skills and AFTER audit | completed | Three required skills read fully; system reuse/exclusions recorded; AFTER006:0 HIGH/0 MEDIUM/1 optional LOW,unselected; no aesthetic approval inferred. |
| Security/permission review | scoped checks passed | Current-role/scope denial,retry,CSRF/Origin,immutable history,private merge and rollback;207 JS/0 configured secret; final report24 step arrays/0 detailed; guarded synthetic cleanup. |
| Implementation docs/traceability | updated and validated | API/data/architecture/screens/components,operations/QA/lessons/traceability and sprint records reconciled; local documentation validator passes. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: required functional regressions resolved and rerun. Evidence retains populated-migration/fixture,UTF-8,after-owner preview,duplicate-reuse pending/focus and unbroken-label corrections; no required failed/skipped gate remains.
- Known limits: Later deals/visits/tasks must reuse this scope service and extend transfer impact previews when those modules exist.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: ownership/collaboration/history,archive/restore and authorized merge are implemented across API/database/French UI. Local HTTPS3000/8000 are available; no real/default account or data was seeded. Bootstrap remains a human operation.
- Remaining review: Khalid's product/design review and optional LOW audit selection; actual Safari/iPhone/assistive-technology user testing are not claimed. Nine inherited HIGH development-tool audit entries remain; runtime npm/Python audits are clear.
- Later-link obligation: only current enquiry links exist. Unknown contact-FK modules fail closed; later modules must extend this same merge path. The cumulative future regression remains unchecked in SP-22, not claimed run here.
- Next safe action: Khalid reviews this slice. SP-07 has not been started by this request.
- Progression: [SP-07](07-standalone-inventory.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

