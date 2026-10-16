# SP-03 — First administrator and login

Status: technically_accepted; local SP-03 scope complete
Date: 2026-10-14  
Priority: 03 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed on 2026-10-14; reproducible evidence linked below
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-02](02-backend-local-integration.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

One local administrator can bootstrap the installation and sign in through the real authenticated frontend.

- Requirements: C01, C13, C14.
- Business rules: BR-01, BR-02, BR-29.
- Screens/interactions: S01, S02 shell; password-change support screen.
- Acceptance scenarios: AT-37; authentication/session portions of AT-02, AT-26, AT-39; AT-23 for changed UI.
- API boundary: POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/change-password under /api/v1. No HTTP bootstrap route.
- Data boundary: agency.bootstrap_completed_at, user, credential, session, audit_event; session token hashes and current authorization.
- Entry prerequisites: SP-02 accepted; migrated isolated identity test database and local HTTPS/facade configured.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. Current execution, corrected defects and exact results are in [SP-03 evidence](sp-03-evidence.md); technical acceptance waits for every final gate.

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

- [First-administrator and staff handoff contract](../../06-delivery-and-operations/admin-bootstrap.md)
- [Next.js authentication](../../reference/nextjs/16.4.0/docs/01-app/02-guides/authentication.md)
- [Next.js backend-for-frontend](../../reference/nextjs/16.4.0/docs/01-app/02-guides/backend-for-frontend.md)
- [FastAPI dependency injection](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/dependencies/index.md)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build login, safe return-path handling, authenticated layout/sidebar, denied/error states and an initial dashboard state showing only implemented functionality.
- [x] Add the restricted password-change support screen and fresh-login transition; user-management handoff UI follows in SP-04.
- [x] Keep sessions in protected cookies, not browser token storage; implement the CSRF header/origin integration and session-expiry navigation.

## Backend tasks

- [x] Implement the interactive local bootstrap command using the identity service, hidden double password prompt and singleton lock; never embed a default account/password.
- [x] Hash passwords with Argon2id, enforce 12-character minimum and generic sign-in errors/rate limiting; issue random revocable PostgreSQL sessions with a seven-day maximum.
- [x] Recheck account/credential state per request; implement logout, own password change, session-bound CSRF token plus Origin validation for authenticated writes and Origin validation for login.
- [x] Reject ordinary staff API calls outside the facade; preserve the direct-transfer exception for SP-09. Test users come from isolated synthetic fixtures, not a production seed.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate bootstrap marker, credentials, session/audit tables and unique normalized sign-in identity; use one transaction for first account/marker/audit.
- [x] Verify no partial user on interrupted bootstrap and exactly one success under concurrent calls. Existing users or a completed bootstrap prohibit another first administrator.

## Testing tasks

- [x] Run AT-37 with controlled TTY/non-TTY, weak/mismatched input, repeats, interruption and real PostgreSQL races.
- [x] Test valid/invalid login, current role/credential checks, session expiry/revocation, CSRF rejection and no sensitive error/log output.
- [x] Playwright and visible Chrome: sign in, refresh protected route, sign out, revisit protected URL, verify redirect and cookie attributes.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Interactive bootstrap creates exactly one complete account or no change on failure.
- [x] Login/logout and protected navigation work through the same-origin facade; revoked/expired sessions cannot access the CRM.
- [x] Credentials are absent from arguments, audit, logs and evidence; relevant backend/E2E/Chrome checks pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review completed: synthetic sign-in/out, protected redirects/cookie flags, invalid feedback, restricted change and fresh login, keyboard/touch/zoom; empty-field or post-login captures only.

## Verification evidence

This execution record verifies the running implementation, not a planned command.
The [evidence record](sp-03-evidence.md) contains the pre-implementation focused
case, real commands, fixtures, corrected failures and platform limits.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | PASS | npm run lint/typecheck/build, exit 0; locked Next 16.4.0/Tailwind 4.3.3; see execution record. |
| Backend quality/unit/API | PASS | Explicit Python 3.14.3 venv; 47/47 pytest, zero skipped, 97% runtime coverage; Ruff check/format, strict mypy and pip check pass. |
| PostgreSQL/migration/concurrency | PASS | Inspected dev/test at 0002_identity, unchanged unrelated catalog; isolated up/down/up, metadata check, interrupted transactions and two observed lock waiters before bootstrap/password-change release. |
| Playwright E2E | PASS | 70/70 across Chromium/Chrome/Edge/Firefox/WebKit; additional 5/5 pending-form cases; real HTTPS/API/PostgreSQL, no fake auth responses. Native Windows WebKit flag reporting limit explicit. |
| Visible Chrome review | PASS | 16/16 headed plus 2/2 extended visual cases; desktop/mobile, actual 200% zoom and empty-field captures inspected. Built HTTPS smoke 7/7. |
| UI skills and AFTER audit | PASS locally | Three skills read, applicability/system reuse/visual evidence recorded; [AFTER audit 003](../../../anti-slop/audit-003-2026-10-14.md), HIGH/MEDIUM/LOW findings 0/0/0; product review not implied. |
| Security/permission review | PASS scoped | Current state/revocation, admin-manager inheritance/admin-only denial, facade/Origin/CSRF, atomicity, redaction/isolation and final report privacy; other business/file boundaries N/A. |
| Implementation docs/traceability | PASS | Contracts, runbook, QA/lessons/security/traceability and sprint records updated; documentation validator passes. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defect register: corrected failures and diagnostic privacy incident are recorded in the execution evidence; no remaining known in-scope functional defect. Nine existing high development-tool advisories and native Windows WebKit/actual-device limits remain explicit.
- Known limits: Only the authenticated shell is available. Agency KPIs arrive in SP-17; staff account administration arrives in SP-04.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: implementation/migration/authentication and scoped verification complete. No real/default administrator was created; product review remains pending.
- First safe action: intended administrator runs scripts/kay.ps1 -Task bootstrap interactively from backend/, chooses their password at hidden prompts, then signs in at https://localhost:3000.
- Execution record: [SP-03 evidence](sp-03-evidence.md) contains exact versions, commands/results, fixtures, privacy corrections, security/visual evidence and known limits.
- Progression: [SP-04](04-user-administration.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

