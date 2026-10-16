# SP-12 — Reservations and overlap checks

Status: technically_accepted at the recorded local boundary  
Date: 2026-10-15  
Priority: 12 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-15 UTC; see execution evidence  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-11](11-deal-pipeline.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

Contact-scoped reservations are reliable under retries and project/unit competition.

- Requirements: C04, C08, C13, C14.
- Business rules: BR-09, BR-13, BR-27.
- Screens/interactions: S08 reservation action; S11/S12/property availability views.
- Acceptance scenarios: AT-09, AT-33; AT-23.
- API boundary: POST /deals/{id}/reserve, POST /deals/{id}/release-reservation; authorized release/cancellation records a reason and actor. Inventory reads return current reservation state.
- Data boundary: reservation, offering/development versions, immutable stock/actor history and outbox events.
- Entry prerequisites: SP-11 accepted; competing deals and whole-development/child offering fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. AT-09/AT-33 reservation, retry, overlap and persistent-history cases pass; AT-23's applicable interface gate passes. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. Outcome/whole-development closing remains SP-13, not acceptance inferred here.

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

- [Offering state diagram](../../../diagrams/offering-states.mmd)
- [Inventory hierarchy diagram](../../../diagrams/inventory-hierarchy.mmd)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [PostgreSQL 18 documentation](https://www.postgresql.org/docs/18/)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Add reserve/release confirmation to deal details with exact target-level labels and current availability.
- [x] Show controlled same-offering and parent/child overlap errors, stale versions, preserved user input and manager-review cues.
- [x] Refresh affected deal/inventory views after committed changes without treating cached client availability as authority.

## Backend tasks

- [x] Check contact scope, offering identity and current stock; enforce one active reservation per offering with no automatic expiration.
- [x] Lock development first and affected offerings in stable order, then recheck hierarchy/versions/active commitments in the transaction.
- [x] Reject overlapping same-kind project/unit reservations; preserve existing sale/rental cross-kind behavior and idempotent retries. Release must be an authorized explicit event.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Add partial unique active-reservation constraint, target/actor history and stable overlap lock discipline.
- [x] Use separate PostgreSQL sessions for concurrent same-offering and parent/child claims; no worker or route may bypass domain checks.

## Testing tasks

- [x] Run AT-09/33 with forced synchronized races and request interruption after commit.
- [x] Assert one success/one safe conflict, original history retention and no time-based expiry.
- [x] Browser tests reserve unit/project offerings, retry, release where permitted and inspect conflicting deals as scoped actors.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] At most one active reservation per offering; overlapping same-kind scopes cannot both reserve.
- [x] Retries do not duplicate reservation effects, and reservations persist without automatic expiry.
- [x] Backend race tests, E2E and visible Chrome evidence pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Reserve a permitted offering, view stock state, simulate a competing claim and inspect the safe conflict/release flow.

## Verification evidence

Actual commands, corrected attempts, source boundaries and remaining limits are in
the [SP-12 execution record](sp-12-execution.md). These results establish scoped
local technical acceptance, not full-product or human product approval.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | passed | Actual npm scripts/exit0; final build vdAiKy5eJbtZ70GZWIiJ0,250 unchanged source fingerprints |
| Backend quality/unit/API | passed | Explicit venv Ruff/format145 files/mypy92 modules; full284/95% coverage plus focused23 cover286 current cases,0 skipped, not one286 invocation |
| PostgreSQL/migration/concurrency | passed | Distinct verified OIDs109060/109061,43 tables/head0014/no drift; real two-session synchronized one-winner races, history/retry/rollback/no-expiry and SQL negatives |
| Playwright E2E | passed |35 five-target deal/reservation cases;8 broader compiled Chrome; final15 affected compiled five-target cases,0 skipped; synthetic real stack |
| Visible Chrome review | passed | Final1/1 pass44.7s,12 valid native captures; keyboard/touch/320–1440/actual200%, minimum contrast6.484:1,0 unexpected page/console errors |
| UI skills and AFTER audit | passed | Required full reads/system reuse/CRM exclusions; detector[]; AFTER012 has0 new findings; fresh finish ship/documenter No changes; product approval not inferred |
| Security/permission review | passed locally | Current scope/CSRF/overposting/replay/transfer/archive/merge/privacy negatives; reports sanitized,8 private paths ignored/0 tracked; project services stopped |
| Implementation docs/traceability | passed | Local wire/model contract, architecture/component facts, traceability, QA register, execution ledger and indexes updated; docs validator exit0 |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Corrected defects/attempts are retained in the execution ledger, including stale applied draft DDL, obsolete contract assertions, test-helper errors and reserve/release error-copy correction. Final affected gates have no failed/skipped required test.
- Known limits: Reservation is not a win or commission. Whole-development close/reopen stock effects arrive in SP-13; stock-event notification consumption arrives in SP-15. Nine inherited HIGH development-tool dependency findings remain; runtime audits are clean.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: persistent holds, explicit reasoned release, database overlap guards, private scoped APIs, French existing-detail confirmations and executable regression coverage are implemented. Additive0014 is applied locally; no development seed/reset.
- Final environment:41 record tables empty/bootstrap unset in each selected target; test-only residual cleanup guarded. Project listeners/processes0; ClamAV stopped/cache retained; shared PostgreSQL and unrelated Docker resources preserved.
- Progression: [SP-13](13-outcomes-reopening.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

