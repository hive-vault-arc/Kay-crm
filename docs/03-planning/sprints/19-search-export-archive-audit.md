# SP-19 — Search, exports, archiving, and audit

Status: technically_accepted; scoped local implementation verified  
Date: 2026-10-15  
Priority: 19 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed at the scoped SP-19 boundary; see execution below  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-18](18-atomic-contact-import.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Search and record lifecycle workflows remain scope-correct through counts, exports, archiving and audit.

- Requirements: C11, C14, C02, C04, C13.
- Business rules: BR-04, BR-06, BR-21, BR-23.
- Screens/interactions: S03/S06/S10 scoped lists; contextual global search, lifecycle actions and permitted dashboard audit view.
- Acceptance scenarios: Pagination/search portions of AT-22, AT-24, AT-29; AT-23.
- API boundary: GET /search, GET/POST /exports, contact/development/property /archive and /restore, GET /audit/events.
- Data boundary: scoped search projections, archived_at, export jobs/metadata, audit_event and retained transaction/history links.
- Entry prerequisites: SP-18 accepted; lifecycle/role-change/export fixtures and worker available.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The scoped variants below are technically verified; unrelated portions and product review remain open.

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

- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Python reference and quality guide](../../reference/python/README.md)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Complete contextual global search and remaining list filters/numbered pages with safe counts/result kinds.
- [x] Add authorized Leads export actions, export status/download and lifecycle confirmations.
- [x] Provide administrator/operational-manager audit access contextually from Dashboard; keep account/schedule Settings administrator-only.

## Backend tasks

- [x] Scope search/counts/autocomplete/document names before projection; prevent contact-existence leaks outside explicit phone-conflict disclosure.
- [x] Generate manager/administrator-only CSV exports, preserve phone text, neutralize formula cells and recheck authorization before delivery.
- [x] Complete recoverable contact/development/property archive/restore; active commitments block unsafe parent archiving and no history is cascaded away.
- [x] Test security-audit two-year retention with a controlled clock; no contact automatic expiry or transaction/finance purge.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Index scoped paginated search after measurements; retain original parent/child/FK/history integrity.
- [x] Keep export job retry state and audit actors; purge policy must exclude protected transaction facts.

## Testing tasks

- [x] Run AT-22/24/29 for stable pages/deep empty pages, filtered counts, safe archives and CSV formula edge cases.
- [x] Revoke permission during export generation, inspect denied delivery and preserve phone values as text.
- [x] Browser tests cross-domain search as manager/agent, export permitted results, archive/restore and inspect allowed audit.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Search/counts/export delivery never reveal out-of-scope private records.
- [x] Export is controlled and formula-safe; archive/restore preserves references and active commitments.
- [x] Lifecycle, retention-clock, API, E2E and Chrome checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Search as different actors, inspect scoped results/counts, export synthetic contacts and archive/restore a safe record.

## Verification evidence

Implemented under the confirmed existing French KAY interface. [Execution ledger](sp-19-execution.md) records the initial focused scenario, corrected attempts, commands/results, skills, independent review and remaining limits. [Concrete contract](../../04-design/discovery-contract.md).

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass | npm scripts exit0; build dmDV0B-5rTHNPUklvY25E |
| Backend quality/unit/API | pass | explicit .venv Ruff/format/mypy157 modules;29 distinct focused cases through27+1+1 passing commands |
| PostgreSQL/migration/concurrency | pass | exact isolated identity, populated0019 preservation/retained-data downgrade refusal,0020/21 no drift; archive/campaign and worker races |
| Playwright E2E | pass | compiled Chrome2/2,44.7s,0 skipped; scoped search, filtered download, lifecycle/audit and retry/new snapshot |
| Visible Chrome review | pass | headed1/1,29.0s; six widths/keyboard/touch/actual200%; unexpected errors0, Windows10054 teardown noted |
| UI skills and AFTER audit | pass at scope | mandatory reads/system reuse/taste exclusions;16+2 valid captures, detector[], AFTER019 zero new findings; fresh finish ship/documenter |
| Security/permission review | pass at scope | private names/counts/CSV/current-role revocation, strict single-use transfers, archive integrity and controlled24-month security-only retention |
| Implementation docs/traceability | updated | execution, discovery/API/data/screen/QA/security/acceptance/root guides; no broader acceptance claim |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Corrected defects and failed attempts are retained in [execution](sp-19-execution.md); no required final check is failed or skipped.
- Known limits: Retention periods for real transaction evidence remain pending; this local sprint implements preservation, not deletion of that history.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Implemented search/export/lifecycle/audit vertical slice, two additive migrations and focused backend/API/browser/native checks; product review independently pending.
- Next safe action: Khalid reviews the implemented workflows; SP-20 is next in the technical sequence, not implemented here.
- Evidence, changed boundaries, corrections, CLI/worker limits and repeatable lesson are saved in the execution ledger. Inherited metadata/toolchain/V3/full-product limits remain disclosed.
- Progression: [SP-20](20-local-website-intake.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

