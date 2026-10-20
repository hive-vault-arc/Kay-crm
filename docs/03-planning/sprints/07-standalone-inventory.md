# SP-07 — Standalone property inventory

Status: technically_accepted; scoped local implementation and exit gates passed  
Date: 2026-10-15  
Priority: 07 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-15; see [execution evidence](sp-07-evidence.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-06](06-ownership-contact-history.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Managers maintain physical assets and offerings that every agent can read through safe inventory views.

- Requirements: C04, C11, C13, C14.
- Business rules: BR-06, BR-08, BR-09, BR-25.
- Screens/interactions: S10 Projects standalone-assets tab; property create/edit/detail support views.
- Acceptance scenarios: Inventory facts/permissions in AT-06; price portions of AT-08; AT-27; standalone portions of AT-31; AT-23.
- API boundary: GET/POST /properties, GET/PATCH /properties/{id}, PUT /properties/{id}/owners, /confirm-availability, GET/POST /offerings, PATCH /offerings/{id}.
- Data boundary: property, property_owner, offering and availability history; decimal price and original rental period.
- Entry prerequisites: SP-06 accepted; protected owner contact fixtures and property categories.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The listed standalone variants are verified in the execution record; later/full-product variants are not accepted by inference.

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
- [Offering state diagram](../../../diagrams/offering-states.mmd)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Add Standalone Properties within Projects navigation; create/edit/detail controls for villa, house, apartment and land.
- [x] Build protected contact owner selectors with safe marketing displays and shared inventory statuses.
- [x] Show separate sale/rental prices and original monthly/annual conditions; validate unknown draft data and required availability facts.

## Backend tasks

- [x] Manager/administrator-only inventory writes; all staff can read non-secret facts while private owner records require separate contact scope.
- [x] Implement available/draft/withdrawn offering validation using accepted local H-01/H-02/H-03 defaults: positive target price, at least one legal owner, multiple owners allowed.
- [x] Keep one current sale and one current rental offering per physical asset; use Decimal for exact twelve-month comparison and no template-level stock.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate standalone physical properties, owner links, offering exclusivity, amount/currency/period constraints and reconfirmation history.
- [x] Preserve draft unknown values; test unique references and concurrent current-offering creation.

## Testing tasks

- [x] Test all four categories as standalone, including land sale/rent and apartment without development links.
- [x] Verify agent direct edits fail, private-owner data stays protected and drafts/availability behave under AT-27.
- [x] Browser tests create asset and both offering types, read as agent, and compare original/exact normalized rental prices.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] All supported standalone categories can be saved as drafts and marketed after valid ownership/price checks.
- [x] Inventory permissions and separate sale/rental campaigns hold; decimal comparisons are exact.
- [x] Relevant tests and Chrome review pass; file controls can truthfully show no attachments until SP-09.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Create a standalone property as manager, add owner/offering data, read it as agent and confirm inventory edits are denied.

## Verification evidence

Execution completed on2026-10-15 UTC using only synthetic fixtures and the verified isolated PostgreSQL target. Exact commands, versions, corrected failures and limits are in the [execution record](sp-07-evidence.md) and [QA register](../../QA_COMMANDS.md).

| Boundary | Current result | Evidence |
|---|---|---|
| Frontend lint/typecheck/build | passed | Zero-warning lint, strict types and optimized build exit0; build PLmPxxeNkkGcFrn5eTJFr,20 displayed routes; built HTTPS31/31. |
| Backend quality/unit/API | passed | Explicit venv; Ruff82 files,mypy51 modules;150/150 tests,97% coverage,zero skipped. |
| PostgreSQL/migration/concurrency | passed | Reviewed0007/0008; both targets head0008,22 tables; finite/nonfinite populated upgrade rollback/preservation, constraints, immutable history, real independent campaign races and waiting-role denial. Development identity/unrelated catalog preserved. |
| Playwright E2E | passed |190/190,38 per Chromium/Chrome/Edge/Firefox/WebKit,zero skipped,42.1m. All earlier workflows and seven SP07 cases. |
| Visible Chrome review | passed after scoped correction | Full run43 passed/1 capture-probe failure; corrected SP07 review1/1 passes36.8s (46.9s harness),covering all44 current cases without rewriting the failed command. Widths320–1440,keyboard/touch,actual200% edit,privacy/denial/states;15 refreshed captures inspected. |
| UI skills and AFTER audit | completed | Required three skills read fully; system reuse/exclusions recorded. AFTER007:0 HIGH/0 MEDIUM/0 LOW; earlier optional findings untouched. No product/design approval inferred. |
| Security/permission review | scoped checks passed | Current authority/Contacts scope,CSRF/Origin,strict routes/fields,finite Decimal,history/merge/retry/rollback.226 JS/0 facade secret; final report31 step arrays/0 detailed. Guarded isolated cleanup; development inspected,not reset. |
| Implementation docs/traceability | updated and validated | API/data/architecture/screens,READMEs,QA/security/lessons/traceability and sprint records reconciled; validator passes1018 links/anchors,70 skill links,22 sprints,41 AT mappings,13 Mermaid pairs,9 JSON examples. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: required functional cases pass after aggregate-pending, literal-query/hydration, logout-order and test actor-switch/capture-probe corrections. Failed attempts remain in the execution record; no required case remains failed or skipped.
- Known limits: hierarchy/developments arrive in SP-08; reservations/dispositions in SP-12/13; private file transfer in SP-09. No template-level stock or partly committed whole-development behavior is introduced.
- Scope exclusion: production/cloud provisioning, real-data operations and all unpromoted O01–O23 options.
- Handoff: physical standalone inventory, protected legal-owner links, separate sale/rental campaigns, availability/reconfirmation and immutable history are implemented across database/API/French UI. Local HTTPS3000/8000 are available. No real/default account or inventory was seeded; administrator bootstrap remains a human operation.
- Remaining review/risk: Khalid's product/design review; actual Safari/iPhone and assistive-technology user testing not performed. Nine inherited HIGH development-tool advisories remain; runtime npm and Python dependency audits are clean. Earlier optional aesthetic findings remain unselected.
- Data/security handoff: both verified targets head0008; all20 record tables empty and bootstrap unset at final inspection. Only isolated synthetic fixtures were cleared under the lease; they are reproducible from tests. Development was never reset.
- Next safe action: Khalid reviews this slice. SP-08 has not been started by this request.
- Progression: [SP-08](08-development-hierarchy.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

