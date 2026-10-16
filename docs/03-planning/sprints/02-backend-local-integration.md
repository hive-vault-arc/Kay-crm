# SP-02 — Initialize the backend and local integration

Status: technically_accepted; local backend/HTTPS integration implemented  
Date: 2026-10-14  
Priority: 02 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-14; see [execution record](sp-02-evidence.md)  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-01](01-frontend-initialization.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

The frontend talks to a real local FastAPI/PostgreSQL stack with isolated tests and reproducible Python tooling.

- Requirements: C13, C14.
- Business rules: BR-22, BR-24 (foundation only).
- Screens/interactions: S01/S02 shell connectivity; no business dashboard yet.
- Acceptance scenarios: AT-23/26 (local transport foundation); setup-specific health and database-isolation scenarios.
- API boundary: GET /api/v1/health/live and GET /api/v1/health/ready; safe status only. The Next.js facade relays ordinary calls to local FastAPI.
- Data boundary: SQLAlchemy metadata/Alembic versioning, local connection configuration, independent test/benchmark/recovery database targets; no unrelated-table mutation.
- Entry prerequisites: SP-01 accepted; development database kayrealestate and its password supplied in the private local note; remaining role/host/port verified in ignored configuration; permission to use separate local test databases.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23/26 transport/setup variants passed with evidence below; full business/UI/security scenarios are not marked passed.

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

- [Python venv (version-matched)](../../reference/python/3.14.3/html/library/venv.html)
- [Python reference and quality guide](../../reference/python/README.md)
- [Python quality standard](../../reference/python/code-quality-for-kay.md)
- [FastAPI installation/first steps](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/first-steps.md)
- [FastAPI larger applications](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/bigger-applications.md)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
- [Alembic installation and migrations](https://alembic.sqlalchemy.org/en/latest/tutorial.html)
- [PostgreSQL 18 documentation](https://www.postgresql.org/docs/18/)
- [Psycopg installation](https://www.psycopg.org/psycopg3/docs/basic/install.html)
- [pip-tools locking](https://pip-tools.readthedocs.io/en/latest/)
- [Next.js backend-for-frontend](../../reference/nextjs/16.4.0/docs/01-app/02-guides/backend-for-frontend.md)
- [Next.js local HTTPS CLI](../../reference/nextjs/16.4.0/docs/01-app/03-api-reference/06-cli/next.md)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Implement the typed facade/client boundary and normalized French API error display; keep credentials/server secrets out of public variables.
- [x] Configure local HTTPS with the ignored local CA/certificate shared by Next.js and Uvicorn; use explicit CA trust for server-to-server calls.
- [x] Extend Playwright lifecycle configuration to start/wait for frontend and API in the test environment; avoid cached private responses.

## Backend tasks

- [x] Create backend/, pyproject.toml and .venv using Python 3.14.3; install declared/hash-locked runtime and development groups only through the venv interpreter.
- [x] Configure FastAPI routers, settings, synchronous SQLAlchemy sessions, Alembic, Ruff, mypy, pytest and HTTPX. Create only modules needed for this foundation.
- [x] Add live/ready endpoints, request IDs, safe errors and lifespan-managed database connections; readiness returns 503 when PostgreSQL is unavailable.
- [x] Provide local startup/test/migration wrappers with explicit .venv paths, secret-free examples and a guard against running backend commands with a global interpreter.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Read supplied connection configuration from ignored local files; inspect database identity, application-owned tables and migration state before applying anything.
- [x] Use the already-created development database kayrealestate, with the supplied password read privately from the local note. Preserve unrelated contents; do not reset it or silently stamp an unknown schema.
- [x] Provision or verify separate test, benchmark and recovery databases; tests must compare resolved identities and refuse the development connection. Register PostgreSQL 18 CLI paths even if absent from PATH.

## Testing tasks

- [x] Prove pytest uses .venv and real PostgreSQL; test connection lifecycle, readiness success/503 and redacted errors.
- [x] Test migration setup on the isolated test database and the fixture guard refusing a development target.
- [x] Run frontend-to-facade-to-API Playwright smoke tests and headed Chrome; stop/restart API to verify clear failure/recovery without false success.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] The venv runtime and locked installs are reproducible; Ruff/mypy/pytest and frontend checks pass.
- [x] The frontend displays real readiness status, including a controlled unavailable response.
- [x] Database identities are recorded without secrets; unrelated development contents are unchanged and test isolation is enforced.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review completed: real readiness through the facade, process stop/restart and keyboard/touch recovery, desktop/mobile and actual 200% zoom; see the execution record.

## Verification evidence

Executed 2026-10-14. [Detailed evidence](sp-02-evidence.md) records versions, identities, commands, corrections, screenshots, skill/audit evidence and remaining limits.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | passed | Actual frontend scripts exit 0; optimized build and built-server smoke 4/4. |
| Backend quality/unit/API | passed | Python 3.14.3 .venv; Ruff/format/mypy, 14 pytest cases and 97% runtime coverage. |
| PostgreSQL/migration/concurrency | passed for foundation | Distinct live cluster/OID targets, real separate connections, rollback/lifecycle, up/down/up, fixture/alias and unknown-schema refusal; development unrelated catalog unchanged. Business races N/A. |
| Playwright E2E | passed | 35/35, zero skipped, real HTTPS frontend/facade/FastAPI/PostgreSQL across five browser targets; loading/failure/recovery and SP-01 regression. |
| Visible Chrome review | passed | 8/8; visitor preview, 1440×900, 360×800 touch and actual 200% zoom; API stopped/restarted, recheck and safe screenshots. |
| UI skills and AFTER audit | completed | Three required reads, explicit marketing exclusions, reused system components/tokens; [AFTER audit 002](../../../anti-slop/audit-002-2026-10-14.md), zero numbered findings; product review pending. |
| Security/permission review | scoped review complete | Explicit CA/no-store/secret-only authority; denied direct readiness; redaction and client-bundle/exclusion checks. Python audits clean; inherited npm dev-tool advisories documented, not clean. Business auth/cookies N/A. |
| Implementation docs/traceability | updated | QA register, backend/frontend startup, API/data contracts, traceability, sprint/backlog/index, audit and lessons. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Resolved defects: strict CLI types, hash-lock build tools, installed HTTPX adapter/lifespan, Windows process-tree termination and modal/live-region hydration; affected checks rerun. No unresolved functional defect remains in this foundation.
- Known limits: inherited npm development-tool advisories, actual iPhone/Safari/assistive-technology tests, private-CA browser acceptance and future least-privilege/network hardening are recorded in evidence. No business feature or complete AT-23/26 acceptance is implied.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: backend manifest/locks/.venv, guarded PostgreSQL/Alembic baseline, safe health routes, local HTTPS facade/client/status UI and executable full-stack checks are implemented. Product review is pending.
- Reproduce: backend/README.md, frontend/README.md and docs/QA_COMMANDS.md. No credentials are entered through the UI or committed.
- No development reset, real-data import, production access, external messaging, source commit/push or cloud provisioning occurred. Only SP-02 was implemented in this request.
- Progression: [SP-03](03-bootstrap-login.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

