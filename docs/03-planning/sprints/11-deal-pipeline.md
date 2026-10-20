# SP-11 — Deal creation and pipeline

Status: technically_accepted; scoped local implementation verified  
Date: 2026-10-15  
Priority: 11 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: 2026-10-15 UTC; see execution evidence  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-10](10-requirements-shortlists.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Users deliberately create contact-scoped deals and progress through the fixed pipeline with auditable offers and actions.

- Requirements: C08, C02, C13, C14.
- Business rules: BR-05, BR-06, BR-12, BR-29.
- Screens/interactions: S06, S07, S08; S05 Create Deal action.
- Acceptance scenarios: Stage portions of AT-12; deal portions of AT-39; AT-23.
- API boundary: GET/POST /deals, GET/PATCH /deals/{id}, POST /deals/{id}/transition, GET/POST /deals/{id}/customer-offers, PATCH /customer-offers/{id}.
- Data boundary: deal, deal_stage_event, customer_offer; optional requirement/offering linkage and true actor.
- Entry prerequisites: SP-10 accepted; permitted contacts, requirements and offering fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. [Execution evidence](sp-11-evidence.md) records the pre-implementation E2E plan, actual results and remaining gates; no SP-11 scenario is marked passed yet.

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

- [Deal state diagram](../../../diagrams/deal-states.mmd)
- [Operational glossary](../../02-requirements/glossary.md)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build searchable/filterable numbered deal table with configurable columns and scoped responsible/stage summaries.
- [x] Build one deal-create form accessible from Leads or Deals; prefill a permitted contact and optional requirement/offering from context.
- [x] Build detail/pipeline, next-action edit, customer price proposals and true-actor history; display unavailable future commands truthfully until their sprint.

## Backend tasks

- [x] Derive current responsible agent from contact scope; preserve separate enquiries and deals with no automatic lead conversion.
- [x] Implement fixed stage codes and allowed stage skipping, version checks and retry-safe writes.
- [x] Store customer offers separately; an accepted customer offer cannot make a deal won. Ordinary PATCH/transition cannot bypass the future dedicated close/reservation commands.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate deals/stage events/customer offers and real contact/requirement/offering relationships.
- [x] Validate linked requirements belong to the deal contact and historical offering target identity remains stable.

## Testing tasks

- [x] Run stage-skipping and no-auto-close variants of AT-12; invalid stage and permission checks.
- [x] Test idempotent deal create, concurrent version mismatch and safe handling of stale input.
- [x] Browser tests create from lead and from list, filter/page/change columns, record an offer and skip a permitted stage.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Enquiries remain intact and every deal is explicitly created for a permitted contact.
- [x] The fixed pipeline and customer-offer distinction hold; no ordinary update can invent a won outcome.
- [x] List/detail/form and permission/version checks pass in backend, Playwright and Chrome.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Create a deal from a lead, record a customer offer, progress/skip a stage, then verify it in scoped list/detail views.

## Verification evidence

The [execution record](sp-11-evidence.md) retains commands, versions, failed
attempts/corrections, final results, source fingerprints and limits. Technical
acceptance does not imply Khalid's product/design approval.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | Node24.13.1/npm11.8.0; optimized build and final test-only lint/types pass |
| Backend quality/unit/API | pass | Explicit venv Python3.14.3; Ruff/mypy90 modules;263 tests/95% coverage/zero skipped |
| PostgreSQL/migration/concurrency | pass | Distinct dev/test OIDs;0013/42 tables/no drift; populated preservation/refusal, real races/rollback |
| Playwright E2E | pass through corrected reruns |20 SP-11 five-target cases; final25 affected compiled cases across five targets;36 Chrome cases verified through32 prior plus4 corrected shell passes, not a clean36 invocation |
| Visible Chrome review | pass | Final1/1 headed/16 valid native captures; desktop/mobile, keyboard/touch/real200%, roles/recovery/private bytes |
| UI skills and AFTER audit | pass | Required skills/applied exclusions; incumbent components/tokens; AFTER011 finding1 selected and verified; fresh finish ship/documenter No changes |
| Security/permission review | scoped pass | Current authority/replay/CSRF/typed guards/private files/antivirus; final privacy/isolation/shutdown pass;9 inherited HIGH dev-tool audit findings retained |
| Implementation docs/traceability | pass | API/data/architecture/screen/component/security/AT/runbook/QA/lessons updated; execution record linked |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Corrected defects/attempts: typed research-intent conflict, stale navigation/selector assumptions and evidence timing/width. Scanner retry test now respects real fenced-lease recovery. All final affected checks pass; details retained in evidence.
- Known limits: Reservation and closing commands arrive in SP-12/13; finance arrives in SP-16.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: explicit deal creation/list/detail/pipeline/proposals/history/private files implemented; enquiries and stock remain independent. Test services stopped; shared PostgreSQL preserved.
- Limits:9 inherited HIGH development-tool audit findings; runtime/Python audits clean. Actual devices, production and full-product/load/recovery acceptance are not claimed.
- Next safe action: Khalid reviews the product; SP-12 is the next ordered implementation, outside this sprint's delivered scope.
- Progression: [SP-12](12-reservations-overlap.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

