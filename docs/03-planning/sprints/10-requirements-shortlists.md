# SP-10 — Requirements and shortlists

Status: implemented; scoped technical exit accepted  
Date: 2026-10-15  
Priority: 10 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: accepted 2026-10-15 UTC; see execution evidence  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-09](09-protected-files-antivirus.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

An agent records independent searches and shortlists exact offering targets using accurate MAD comparisons.

- Requirements: C03, C04, C13.
- Business rules: BR-07, BR-08, BR-06.
- Screens/interactions: S05/contact requirements tab; project/property offering selector.
- Acceptance scenarios: AT-07, AT-08; relevant AT-36 inventory filters; AT-23.
- API boundary: GET/POST /requirements, GET/PATCH /requirements/{id}, POST /requirements/{id}/shortlist, DELETE /requirements/{id}/shortlist/{offering_id}, GET /offerings.
- Data boundary: requirement, requirement_criterion, shortlist_entry and exact rental comparison derived from original offering conditions.
- Entry prerequisites: SP-09 accepted; sale/rental unit, standalone and whole-development offerings available.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. [Execution evidence](sp-10-evidence.md) records actual results and remaining exit gates; full-product acceptance is not inferred.

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
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build contact/lead detail requirement forms with sale/rent intent, budget period, required/preferred criteria and explicit unknown values.
- [x] Add inventory offering search and shortlist feedback with target-level labels; never select a reusable type as an offering.
- [x] Show monthly/yearly values and exact annual comparison without converting original conditions.

## Backend tasks

- [x] Enforce linked-contact scope for requirements and shared inventory projection for selection.
- [x] Validate unknown versus zero/false and maintain separate searches on the same contact.
- [x] Compute rental normalization exactly in Decimal/PostgreSQL numeric; reject unsupported currency and invalid numeric constraints.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate requirements/criteria and requirement-offering shortlist links with FK/uniqueness constraints.
- [x] Keep independent requirements and correct offering target references through inventory/archive history.

## Testing tasks

- [x] Run AT-07/08 for multiple independent requirements, invalid zero area and exact decimal edge cases.
- [x] Test forbidden contact requirement reads/writes and invalid shortlist target IDs.
- [x] Browser tests create two searches, compare monthly/yearly rent and add/remove exact unit or whole-development offerings.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Required/preferred/unknown criteria remain distinct and multiple requirements are independent.
- [x] Shortlists reference real offerings and preserve original rental prices while comparing exactly.
- [x] Allowed/denied/invalid cases and browser checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review checklist: two contact searches, permitted filters, exact rents, specific unit/whole-programme selections and actual target navigation pass. Final native captures and the reviewer's single-finding ship verdict are recorded separately from Khalid's approval.

## Verification evidence

Current results are summarized below; [the execution record](sp-10-evidence.md)
retains exact commands, versions, fixtures, failed attempts and corrected reruns.
Scoped browser/review/privacy/cleanup gates pass. Product review is separate.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | Final lint/typecheck/build exit0; build eCCqBWaV9DSQJZnhOZPD-;219 source hashes unchanged after smoke |
| Backend quality/unit/API | pass | Explicit Python3.14.3 venv; Ruff/format/mypy78;223 tests,zero skipped,94% coverage |
| PostgreSQL/migration/concurrency | pass | Both38 tables/head0012/no drift; identity preserved; real races/revocation/rollback/SQL guards |
| Playwright E2E | pass in recorded scope |160 distinct five-target cases via corrected reruns, not one clean160 invocation; latest SP10 10/10 across five targets; final built HTTPS32/32 |
| Visible Chrome review | pass; scoped verdict ship | Actual1/1 pass54.4s/16 inspected native images,320–1440/touch/keyboard/200%; settled removal focus and persistent current search; reviewer's one P2 resolved |
| UI skills and AFTER audit | pass | Required reads/system reuse/exclusions; [AFTER010](../../../anti-slop/audit-010-2026-10-15.md)0 new aesthetic findings/no audit-only fix; documenter records selection fact |
| Security/permission review | pass with disclosed limits | [Security record](sp-10-evidence.md#security-boundary-record); current-scope replay, strict facade, safe projection, races/retries/rollback, bundle/report privacy and isolated cleanup |
| Implementation docs/traceability | updated and validated | API/data/architecture/screen/components/runbooks/harness/QA/security and acceptance evidence; documentation validator exit0 |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: failed intermediate assertions, capture validity, async focus and persistent-selection corrections are retained with passing reruns. The initial WebKit scanner-wait timeout did not reproduce; its cause is unproven and remains a test-stability risk, not a claimed fix.
- Known limits: Selection does not reserve inventory. Deal and reservation actions follow in SP-11/12.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Current handoff: implemented and technically accepted vertical slice; additive0012 migration, final compiled smoke, privacy/isolation and docs gates pass. Project app/test/scanner services stopped; shared PostgreSQL/cache retained.
- Next safe action: Khalid reviews the implemented workflow; do not start SP-11 automatically.
- Disclosed limits:9 inherited HIGH npm development-tool findings (runtime0); unproven transient WebKit timeout; real devices/assistive technology/load/recovery and later sprints remain outside this acceptance.
- Implementation bounds are technical proposals; see the execution record/wire contract. Product/design review remains pending Khalid.
- Progression: [SP-11](11-deal-pipeline.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

