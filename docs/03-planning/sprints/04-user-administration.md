# SP-04 — User administration and temporary credentials

Status: technically_accepted; local SP-04 scope complete  
Date: 2026-10-14  
Priority: 04 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed on 2026-10-14; reproducible evidence linked below  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-03](03-bootstrap-login.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

An administrator manages named staff while temporary credentials and current permissions remain enforced.

- Requirements: C01, C13, C14.
- Business rules: BR-01, BR-02, BR-06.
- Screens/interactions: S14, S15, S16; password-change support screen.
- Acceptance scenarios: AT-01, AT-02, AT-38; AT-23 for settings and forms.
- API boundary: GET /users, GET /users/{id}, POST /users, PATCH /users/{id}, POST /users/{id}/confirm-handoff, /reset-password, /disable; restricted auth routes.
- Data boundary: user role/state, credential.must_change_password/temporary_expires_at/handoff_confirmed_at, session revocation, audit events.
- Entry prerequisites: SP-03 accepted; active synthetic administrator, manager and agent fixtures.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. [SP-04 evidence](sp-04-evidence.md) records the passing local staff/authentication/UI variants and limits; real handoff and product/design review remain separate.

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
- [FastAPI dependency injection](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/dependencies/index.md)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [Zod validation](https://zod.dev/)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)
- [KAY shadcn/ui guide](../../04-design/ui-components.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Build administrator-only Settings hub, paginated All Users table and shared create/edit form.
- [x] Implement one-time temporary-credential display, confirmed handoff, expired/lost credential recovery, password-change feedback and required fresh login.
- [x] Map Remove to deactivation/session revocation; hide forbidden controls without relying on their visibility for authorization.

## Backend tasks

- [x] Add administrator-only user list/detail reads and create/update/disable/reset commands.
- [x] Generate random temporary credentials, store only hashes, return plaintext once with no-store, enforce pending_handoff and a 24-hour temporary lifetime.
- [x] Require the current administrator password for another user's reset; revoke target sessions; enforce restricted sessions until a successful password change.
- [x] Protect the last active administrator from accidental disable/demotion and document the safe conflict response; retain all historical actor IDs.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Add handoff/temporary state and audit constraints/indexes; role/disable/reset effects and session revocations commit consistently.
- [x] Test concurrent role/disable changes against current state; no GET response may retrieve a temporary plaintext credential.

## Testing tasks

- [x] Run AT-01/02/38 permitted, expired, wrong-admin-password and role-denied paths.
- [x] Verify manager/agent direct API and copied settings URLs fail; assert temporary secrets are not logged/persisted.
- [x] Browser tests complete create → pending denial → handoff → restricted login → password change → fresh login, then disable and verify revocation.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Administrator user management works; managers/agents cannot perform account administration.
- [x] Temporary credentials require handoff and change, expire, and never become retrievable after their one-time response.
- [x] Deactivation preserves attribution and ends access; all applicable tests and Chrome review pass.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review completed: full synthetic staff handoff/password change, roles, numbered list and revoked session, plus touch/keyboard/dialog/200% zoom. See the execution record.

## Verification evidence

Final local execution record, 2026-10-14. Exact commands, versions, corrections, security boundaries, artifacts and limits are in [SP-04 evidence](sp-04-evidence.md) and [QA commands](../../QA_COMMANDS.md).

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | PASS | All exit 0; 11 route manifest entries; 12/12 built HTTPS smoke cases. |
| Backend quality/unit/API | PASS | Explicit Python 3.14.3 venv; Ruff/format/mypy; 62/62 pytest, 97% runtime coverage. |
| PostgreSQL/migration/concurrency | PASS | 0003 on inspected development/test; isolated up/down/up and observed real lock contention; unrelated catalog unchanged. |
| Playwright E2E | PASS | 95/95, five browser targets, zero skipped; real local stack and guarded synthetic fixtures. |
| Visible Chrome review | PASS | 22/22 headed, desktop/mobile/keyboard/touch/zoom and staff flow; empty-field safe captures viewed. |
| UI skills and AFTER audit | complete; one low pending | Three skills/applicability recorded; [audit 004](../../../anti-slop/audit-004-2026-10-14.md): 0 high/0 medium/1 low; finding 1 awaits Khalid selection, no audit-only fix. |
| Security/permission review | PASS scoped | Origin/CSRF/facade/current role, handoff/expiry/reset/revoke, retry/race/rollback, projection/log/artifact/isolation checks. |
| Implementation docs/traceability | updated | API/data/runbook/screens/QA/acceptance/traceability and lessons linked; no full-product claim. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Defects: corrected harness synchronization, reset-interruption hook, stale foundation-route assertion, interrupted fixture cleanup, pagination reselection and scan coverage; final required checks pass. No known remaining in-scope functional defect.
- Known limits: In-person delivery requires Khalid's separate real-world confirmation for real staff. Local tests simulate that confirmation with fictional users.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: frontend/API/migration/tests and contracts implemented; no real/default account, external delivery, commit or push. Product review and audit finding 1 remain pending.
- First safe action: intended administrator runs the private interactive bootstrap if needed, signs in, then opens Paramètres → Tous les utilisateurs for local review. Never reset development to recreate an administrator.
- Evidence: the linked execution record lists changes, exact checks, residual risks and repeatable lessons. Real Safari/device testing, existing nine development-tool advisories and later operations/business gates remain separate.
- Progression: [SP-05](05-leads-contact-identity.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

