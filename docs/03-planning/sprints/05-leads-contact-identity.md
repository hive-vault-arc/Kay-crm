# SP-05 — Leads and contact identity

Status: technically_accepted for local SP-05; product/design review pending  
Date: 2026-10-14  
Priority: 05 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-14; [execution evidence](sp-05-evidence.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-04](04-user-administration.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Authorized staff create and find enquiries without duplicating or disclosing private contact identities.

- Requirements: C02, C11, C13, C14.
- Business rules: BR-03, BR-04, BR-06, BR-21, BR-29.
- Screens/interactions: S03, S04, S05; contact selector.
- Acceptance scenarios: AT-03, AT-04; list portions of AT-22/39; AT-23.
- API boundary: GET/POST /contacts, GET/PATCH /contacts/{id}, POST /contacts/resolve-phone; GET/POST /enquiries, GET/PATCH /enquiries/{id}. POST /enquiries supports contact_id XOR new_contact atomically.
- Data boundary: contact, contact_phone, contact_email, enquiry, idempotency_record and assignment context; active normalized-phone uniqueness.
- Entry prerequisites: SP-04 accepted; synthetic actors and protected contact fixtures in the isolated test database.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The scoped results below do not accept SP-06 merge/history or later intake/deal/reporting variants.

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
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [Zod validation](https://zod.dev/)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build Leads list/search/filters/numbered pages and user-configurable visible columns; persist column IDs/order only, never record data.
- [x] Build lead create/edit/detail with reused contact form controls, international phone input and primary phone/email choices.
- [x] Support person/organization contacts and multiple buyer/seller/owner/tenant/developer roles; these contact roles never create new staff permissions.
- [x] Handle accessible duplicate confirmation and private-phone denial; keep valid input for recoverable errors and version conflicts.

## Backend tasks

- [x] Normalize international phones using maintained phonenumbers metadata; require contact name/phone and exactly one primary for each nonempty collection.
- [x] Create a new contact and its enquiry in one PostgreSQL transaction; reuse accessible contacts only after the documented choice. No separate lead table.
- [x] Set a new agent-owned contact's primary agent to the actor; manager/administrator can select an active responsible agent. Enquiry assignee must retain contact scope.
- [x] Filter before search/count/sort/page and whitelist writable/visible fields; use idempotent creates and safe duplicate errors.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate contact identity, phone/email, enquiry and retry records with unique active phones and source/submission keys.
- [x] Include contact type/role links and retained source provenance in the migration and response schemas.
- [x] Test concurrent attempts to claim a normalized phone; failed lead creation leaves neither a partial contact nor an enquiry.

## Testing tasks

- [x] Run AT-03/04 with Morocco/international numbers, multiple primary choices, missing fields and same-name/different-phone cases.
- [x] Test phone races, atomic rollback/retry and out-of-scope counts/search/IDs.
- [x] Playwright and Chrome create/edit/find leads, choose columns, page/filter, resolve an accessible duplicate and encounter another agent's private number.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] One normalized phone maps to one active contact; each explicit enquiry remains separate.
- [x] A private-phone conflict reveals only the permitted responsible-agent display name and allows no duplicate/access.
- [x] Lists and forms work in French with server-scoped totals, stable pages and all applicable checks passed.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Create a synthetic lead, search/filter/page it, change columns, and demonstrate both accessible duplicate and private-contact responses.

## Verification evidence

Full commands, versions, fixtures, corrections, safe captures and remaining risks
are recorded in [SP-05 execution evidence](sp-05-evidence.md). Local technical
acceptance is separate from Khalid's product/design review.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | passed | All exit0; Next16.4.0 build has16 routes; five new contact/Lead placements. |
| Backend quality/unit/API | passed | Explicit .venv Ruff/format/mypy;56 files/35 app modules;100/100 pytest,zero skipped,98% runtime coverage. |
| PostgreSQL/migration/concurrency | passed | 0004 development/test on distinct inspected OIDs; isolated up/down/base/up, metadata check, direct phone/primary/assignment constraints, real phone/version/waiting-actor races and atomic rollback/retry. Unrelated development catalogue unchanged. |
| Playwright E2E | passed | 130/130,five targets,zero skipped,25.9m; full earlier regressions plus seven SP05 cases/target. Built HTTPS19/19 passed3.3m. |
| Visible Chrome review | passed | 30/30 headed,zero skipped,5.6m; supplemental zoom and settled mobile checks pass. Desktop/mobile/touch/keyboard/actual200%; all11 final safe captures inspected, no unexpected application errors. |
| UI skills and AFTER audit | recorded | Three complete reads, dense product/table/form design-taste exclusion, shared tokens/shadcn/Tailwind; Bklit N/A. [Audit005](../../../anti-slop/audit-005-2026-10-14.md):0 HIGH/0 MEDIUM/1 LOW pending Khalid selection. Independent scoped UI disposition ship; incumbent-system documenter confirms preservation. No audit-only fix or design approval. |
| Security/permission review | passed for implemented scope | Current full sessions, role/object/queue denial, private-name-only conflict, strict fields, Origin/CSRF/facade, retry/rollback, migration isolation,203 client chunks clean,19 report step arrays with zero details; private files ignored/not tracked. |
| Implementation docs/traceability | updated | API/data/architecture/screens/reuse, QA, traceability, lessons and sprint/backlog evidence reconciled; documentation validator run separately. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: implementation/regression/accessibility defects corrected and affected checks rerun; no remaining known in-scope functional defect. Invalid captures were rejected and recaptured, not counted as passes. Audit005 LOW1 is an optional aesthetic proposal awaiting Khalid's selection.
- Known limits: Timeline/collaboration management arrives in SP-06. Create Deal is only enabled once SP-11 implements that action.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: contacts/enquiries backend,0004 migration, scoped French UI, safe facade, harness/tests and contracts implemented. No real/default account or contact seeded; both final targets have0 users/sessions/contacts/enquiries and bootstrap marker unset. No production access, external send, commit or push.
- First safe action: if not initialized, run `backend/scripts/kay.ps1 -Task bootstrap` from a real interactive terminal, choose the administrator password privately, then sign in at [local KAY](https://localhost:3000) and open Prospects. Reuse existing accounts if initialized; never reset development to bootstrap again.
- Limits: actual iPhone/Safari/assistive-technology user testing, full-product load/recovery and future modules remain unverified. Runtime audits are clean; nine inherited HIGH development-tool advisories remain explicit. Product/design review pending.
- Progression: [SP-06](06-ownership-contact-history.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

