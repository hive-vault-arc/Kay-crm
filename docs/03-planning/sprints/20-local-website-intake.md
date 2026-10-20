# SP-20 — Local website-form intake

Status: technically_accepted; scoped local gates passed  
Date: 2026-10-16  
Priority: 20 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed scoped SP-20 local gates; [execution](sp-20-execution.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-19](19-search-export-archive-audit.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

A local signed form server submits enquiries reliably without contact disclosure or duplicate delivery effects.

- Requirements: C12, C02, C11, C14, C13.
- Business rules: BR-03, BR-04, BR-21.
- Screens/interactions: S03/S05 received leads; local simulator support interface.
- Acceptance scenarios: Intake portions of AT-22, AT-30; AT-23 for received-lead UI.
- API boundary: POST /intake/website/{source_key}; local simulator is a separate local server, not a public CRM registration endpoint.
- Data boundary: website_receipt, enquiry, source/submission uniqueness, outbox/job processing and protected contact routing.
- Entry prerequisites: SP-19 accepted; local simulator source/signing secret configured and worker available.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. The scoped executable variants passed as recorded below; no cumulative SP-22/full-product acceptance is implied.

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

- [FastAPI larger applications](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/bigger-applications.md)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [Next.js backend-for-frontend](../../reference/nextjs/16.4.0/docs/01-app/02-guides/backend-for-frontend.md)
- [Python reference and quality guide](../../reference/python/README.md)
- [Requirements traceability](../../05-quality/traceability.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Provide a local synthetic form simulator and demonstrate submissions appearing in scoped Leads views.
- [x] Show durable receipt/processing/error states without exposing internal CRM identity to the submitting browser.
- [x] Keep staff role/owner choices out of the public form.

## Backend tasks

- [x] Run the simulator from the backend venv on a separate loopback port; its server signs/authenticates calls using an ignored local secret.
- [x] Implement server-side HMAC signature/timestamp/replay validation with a five-minute local replay window and bounded body/rate limits; source_key maps to configured authority.
- [x] Commit receipt and outbox before 202; same source/submission retry returns the same receipt, while a new submission creates a new enquiry for the same contact.
- [x] Route a known private phone to its current authorized agent/manager queue internally; worker retry cannot duplicate contacts/enquiries or overwrite contact data.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate unique source+submission receipt and processed-enquiry linkage; durable source authority is distinct from a staff session.
- [x] Verify interrupted processing retains a replay-safe receipt and outbox job.

## Testing tasks

- [x] Run AT-22/30 signature mismatch, tampering, replay timestamp, identical retry, new enquiry and known-private-phone cases.
- [x] Stop/restart the real worker after receipt and verify exactly one effect on recovery.
- [x] Browser tests submit the local form, inspect non-disclosing public response, then sign in as authorized staff and find the received enquiry.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Valid local signed submissions are durable and produce the intended scoped enquiry.
- [x] Duplicate/invalid deliveries and worker recovery remain safe and disclose no contact existence.
- [x] The simulator and real connector contract pass pytest/PostgreSQL, E2E and visible Chrome verification.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review to perform: Submit the synthetic local website form, inspect its public receipt, then observe the enquiry in the authorized CRM account.

## Verification evidence

[Full execution, corrected attempts and limitations](sp-20-execution.md).
[Wire/routing/operation contract](../../04-design/website-intake-local.md).

| Boundary | Current result | Evidence |
|---|---|---|
| Frontend lint/typecheck/build | passed | Full baseline; final413 patch targeted ESLint/typecheck/build, shipping build pFQv5uidqUuJVIgkip1ty |
| Backend quality/API | passed | explicit venv Ruff262/mypy169;19 focused pytest passed/10 deselected/0 skipped56.21s |
| PostgreSQL/migration/concurrency | passed | two-connection duplicate/phone races; actual killed worker/restart; populated isolated22->21->22; additive dev0022/no drift |
| Compiled Playwright Chrome | passed | final1/1 passed28.8s/42.4total; lost202 exact retry/scoped staff; no duplicate/no identity overwrite |
| Visible Chrome | passed | workflow1/1; six widths/actual200%/keyboard/touch/states/denied; final real413 recovery1/1; malformed evidence repaired |
| UI skills and AFTER audit | passed scoped technical gate | three mandatory skills read; shared shadcn/Tailwind, no chart; [AFTER020](../../../anti-slop/audit-020-2026-10-16.md)0 new aesthetic findings; independent finish ship after F1/recapture; DESIGN preserved |
| Security/permission | passed scoped checks | signed source/time/body/rate/SQL/current scope; public2-field receipt;0 browser-secret matches;12 ignored/0 tracked paths |
| Docs/traceability | updated and validated | contract, C/BR/AT mapping, QA/security/harness/lessons;22-sprint documentation validator |
| Product review | pending | Khalid's independent acceptance, not inferred from implementation confirmation |

No passwords, signing values, database URLs or private records are in evidence.

## Defects, limits, and handoff

- Implemented signed local form/receipt/outbox/current routing, source provenance,
  operator recovery and received Lead UI; all23 checklist items above verified.
- Independent functional F1: inaccurate413 guidance corrected; retained editable
  Unicode draft can be shortened/resubmitted. Final named review disposition ship.
- Invalid zoom and mobile-error captures were not accepted as evidence; corrected
  named frames independently reopened. Earlier fixture/timing/selector/capture
  attempts and final exact results are retained in execution.
- No unresolved required scoped defect. Earlier optional aesthetic findings,
  inherited PRODUCT/design.json/V3 drift and dev-toolchain audit limits remain
  disclosed; technical completion is not design/product approval.
- Q01 actual site remains unidentified; no deployment/external connection/real-data
  intake. Normal bootstrap/active-agent and explicit development source setup are
  in the runbook; no invented account/source seeded.
- No full CRM/five-browser/coverage/load/real-device/backup claim. SP21/22 pending.
- Final isolated test data0 rows; development data/defaults retained; project app
  listeners/processes0, shared PostgreSQL/unrelated Docker left untouched.
- Next safe action: Khalid's product review or separately requested
  [SP-21](21-local-backup-recovery.md). No automatic SP21 implementation in this turn.


