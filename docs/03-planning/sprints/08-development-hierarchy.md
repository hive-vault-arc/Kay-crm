# SP-08 — Developments, hierarchy, and project briefing

Status: technically accepted  
Date: 2026-10-14  
Priority: 08 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed2026-10-15 UTC; all24 scoped criteria checked  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-07](07-standalone-inventory.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Staff navigate real development units while managers maintain hierarchy and an optional safe project briefing.

- Requirements: C04, C11, C13, C14.
- Business rules: BR-06, BR-25, BR-26, BR-27, BR-31.
- Screens/interactions: S10, S11, S12 units tab, S13.
- Acceptance scenarios: AT-31, AT-32, inventory/navigation portions of AT-35/36, AT-41; AT-23.
- API boundary: GET/POST /developments, GET/PATCH /developments/{id}, GET /developments/{id}/inventory, /blocks, /unit-types, /owners; /blocks/{id}/floors, /floors/{id}, /unit-types/{id}; property/offering operations.
- Data boundary: development, development_owner, block, floor, unit_type, child property, offering target XOR, nullable development.briefing_text.
- Entry prerequisites: SP-07 accepted; development/owner/developer and standalone asset fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The implemented variants pass in the execution record; full-product variants remain with their owning sprints.

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

- [Inventory hierarchy diagram](../../../diagrams/inventory-hierarchy.mmd)
- [Operational glossary](../../02-requirements/glossary.md)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build project list, create/edit/detail and units tab with hierarchy breadcrumbs and block/floor/type/category/availability filters.
- [x] Provide reusable unit-type editing and actual unit rows; clearly distinguish template, unit and whole-development offering.
- [x] Add optional briefing and safe developer/owner display; prefer plain shared text with safe rendering and a proposed 10,000-character limit.
- [x] Default the units tab to available physical units; retain safe counts and numbered pages rather than loading an unbounded tree.

## Backend tasks

- [x] Implement manager-controlled hierarchy and mixed-category developments; require a same-development floor/type for apartment units while other categories may attach directly.
- [x] Allow incomplete project drafts; validate marketable apartment development contains at least one actual block/floor/unit.
- [x] Implement whole-development offerings without treating block/floor/type as stock targets; reject referenced target identity changes.
- [x] Keep protected developer/owner details out of shared projections; briefing remains optional and cannot replace ownership evidence.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate development/block/floor/type relationships, scope uniqueness, optional links and property/development offering target exclusivity.
- [x] Prevent cross-development links and unsafe reparenting/cascading deletion of referenced inventory. Template changes cannot silently rewrite marketed unit facts.

## Testing tasks

- [x] Run AT-31/32 using mixed categories, direct land unit, one/multiple blocks and a type reused across floors.
- [x] Run safe-project projection and optional briefing checks from AT-35/41; navigation/filter checks from AT-36.
- [x] Chrome/Playwright explore a project, filter actual units by type/floor, edit a template and confirm independent unit facts.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Reusable types describe distinct units with their own identity/offering/price/status.
- [x] Hierarchy/category constraints and shared/private boundaries hold in API and UI.
- [x] Project briefing can be omitted or cleared; accepted availability facts, unrelated unit history and permissions are retained.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Explore development → block → floor → actual units, reuse one type across floors and inspect optional briefing as manager and agent.

## Verification evidence

All applicable scoped criteria above are checked against [SP-08 evidence](sp-08-evidence.md),
not inferred from source or earlier sprint counts. Commands, versions, fixtures,
failed intermediate runs and corrected reruns are retained there and in the
[QA register](../../QA_COMMANDS.md).

| Boundary | Verified result |
|---|---|
| Frontend | Lint/typecheck/build exit0; build0mZyw9I1IbVqz57TCdg3n,23 displayed routes/24 app-path entries. |
| Backend |163 passed,zero skipped,203.09s,96% coverage; Ruff/format91 files and strict mypy57 modules pass. |
| PostgreSQL |0009/27 tables on both verified targets; no metadata drift; isolated migration/preservation/constraint/race tests pass. Development identity/catalog unchanged,no reset. |
| Browser regression |105 distinct affected cases covered:63 unchanged Chromium/Chrome/Edge plus corrected complete Firefox/WebKit42/42,zero skipped. Failed original command is explicitly retained,not called clean. |
| Visible Chrome |5/5 pass,1.7m;16 inspected captures,320–1440px,touch/keyboard/states and actual200% edit. |
| Optimized HTTPS |21/21 Chrome cases pass,zero skipped,3.6m against the unchanged build and isolated API/PostgreSQL. |
| UI skills and AFTER audit | Three required complete reads/system-first reuse/design-taste exclusions recorded; [AFTER008](../../../anti-slop/audit-008-2026-10-15.md):0 HIGH/0 MEDIUM/1 optional LOW awaiting Khalid,no audit-only fix. |
| Security/privacy | Current role/Contacts scope, strict input/CSRF/TLS, target integrity, retry/rollback/merge history pass.246 browser JS/0 configured secret; final report21 arrays/0 detailed; guarded isolated synthetic cleanup complete. |
| Dependency risk | Runtime npm and both Python lock audits clean; full npm audit remains9 inherited HIGH development-tool advisories,exit1,not clean. No new dependencies/forced downgrade. |
| Docs/product | Contracts/traceability/QA/lessons updated. Product/design review remains pending Khalid. |

## Defects, limits, and handoff

- Corrected: revision-mismatched migration fixtures, outdated strict-field assertion,
  fixture role/tab assumptions, API start-versus-readiness synchronization,
  wrong-record RHF editor lifetime, and rejection-before-message observation.
  Failed and interrupted commands remain in the evidence.
- No unresolved mandatory functional defect in this slice. Optional AFTER008
  finding1 awaits Khalid's selection; earlier optional findings remain untouched.
- Actual iPhone/Safari/software keyboard/assistive-tech user testing is not verified.
  Files, deals/stock overlap, matching/search/dashboard, load/recovery and deployment
  remain separate required scopes; unpromoted future options are not implemented.
- Development migration and local HTTPS3000/8000 startup are verified. Only
  disposable isolated synthetic fixtures were cleaned; tests can recreate them.
  Development was never reset and no real/default administrator was seeded.
- Next safe action: Khalid reviews the local workflow and independently selects
  any optional audit fix. SP-09 remains unstarted; this handoff does not claim
  product/design approval or start another sprint.

